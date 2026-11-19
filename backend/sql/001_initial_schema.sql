CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, role) VALUES (NEW.id, 'student')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_student_profile();

CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    category text NOT NULL,
    source text NOT NULL,
    content text NOT NULL,
    version text,
    valid_from date,
    valid_to date,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(384),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('french', content)) STORED,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL,
    intent text,
    source_chunk_id uuid REFERENCES document_chunks(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS document_chunks_search_idx
    ON document_chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS documents_status_validity_idx
    ON documents (status, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS conversations_user_created_idx
    ON conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
    ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS feedback_message_idx ON feedback (message_id);
CREATE INDEX IF NOT EXISTS admin_logs_created_idx ON admin_logs (created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read published documents"
    ON documents FOR SELECT
    USING (status = 'published' AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_to IS NULL OR valid_to >= CURRENT_DATE));

CREATE POLICY "Students read chunks of published documents"
    ON document_chunks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM documents d
        WHERE d.id = document_chunks.document_id AND d.status = 'published'
            AND (d.valid_from IS NULL OR d.valid_from <= CURRENT_DATE)
            AND (d.valid_to IS NULL OR d.valid_to >= CURRENT_DATE)
    ));

CREATE POLICY "Users read own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users read own conversations"
    ON conversations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own conversations"
    ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own conversations"
    ON conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read messages from own conversations"
    ON messages FOR SELECT USING (EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    ));

CREATE POLICY "Users add messages to own conversations"
    ON messages FOR INSERT WITH CHECK (role = 'user' AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    ));

CREATE POLICY "Users read feedback for own messages"
    ON feedback FOR SELECT USING (EXISTS (
        SELECT 1 FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = feedback.message_id AND c.user_id = auth.uid()
    ));

CREATE POLICY "Users submit feedback for own messages"
    ON feedback FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = feedback.message_id AND c.user_id = auth.uid()
    ));

CREATE POLICY "Admins manage documents"
    ON documents FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

CREATE POLICY "Admins manage chunks"
    ON document_chunks FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

CREATE POLICY "Admins read logs"
    ON admin_logs FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(384),
    match_count integer DEFAULT 5,
    similarity_threshold float DEFAULT 0.62
)
RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    title text,
    source text,
    content text,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT c.id, d.id, d.title, d.source, c.content,
           1 - (c.embedding <=> query_embedding) AS similarity
    FROM document_chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.embedding IS NOT NULL
      AND d.status = 'published'
      AND (d.valid_from IS NULL OR d.valid_from <= CURRENT_DATE)
      AND (d.valid_to IS NULL OR d.valid_to >= CURRENT_DATE)
      AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
$$;
