ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS matricule text,
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_matricule_unique_idx
    ON public.profiles (matricule) WHERE matricule IS NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'admin', 'super_admin'));

CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intents
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.training_examples (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (octet_length(text) <= 2000),
    UNIQUE (intent_id, text)
);

CREATE TABLE IF NOT EXISTS public.intent_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unknown_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    question text NOT NULL,
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.intent_models (
    model_key text PRIMARY KEY CHECK (model_key = 'active'),
    model jsonb NOT NULL,
    metrics jsonb NOT NULL,
    trained_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    trained_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    question text NOT NULL,
    resolved boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS confidence double precision
        CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS entities jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS training_examples_intent_idx
    ON public.training_examples (intent_id);
CREATE INDEX IF NOT EXISTS intent_responses_intent_idx
    ON public.intent_responses (intent_id);
CREATE INDEX IF NOT EXISTS unknown_questions_unresolved_idx
    ON public.unknown_questions (resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS support_requests_unresolved_idx
    ON public.support_requests (resolved, created_at DESC);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unknown_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read categories"
    ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categories"
    ON public.categories FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')));

CREATE POLICY "Admins manage training examples"
    ON public.training_examples FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')));
CREATE POLICY "Admins manage intent responses"
    ON public.intent_responses FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')));
CREATE POLICY "Admins manage unknown questions"
    ON public.unknown_questions FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')));
CREATE POLICY "Admins manage intent models"
    ON public.intent_models FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')));
CREATE POLICY "Users create own support requests"
    ON public.support_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage support requests"
    ON public.support_requests FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')));
