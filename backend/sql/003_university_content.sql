CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    source text NOT NULL,
    published boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.university_info (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    source text NOT NULL,
    valid_from date,
    valid_to date,
    published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS public.academic_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    source text NOT NULL,
    starts_at date NOT NULL,
    ends_at date,
    published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS announcements_published_idx
    ON public.announcements (published, published_at DESC);
CREATE INDEX IF NOT EXISTS university_info_published_validity_idx
    ON public.university_info (published, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS academic_events_published_start_idx
    ON public.academic_events (published, starts_at);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read published announcements"
    ON public.announcements FOR SELECT USING (published);
CREATE POLICY "Admins manage announcements"
    ON public.announcements FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users read published university information"
    ON public.university_info FOR SELECT
    USING (published AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_to IS NULL OR valid_to >= CURRENT_DATE));
CREATE POLICY "Admins manage university information"
    ON public.university_info FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users read published academic events"
    ON public.academic_events FOR SELECT
    USING (published AND (ends_at IS NULL OR ends_at >= CURRENT_DATE));
CREATE POLICY "Admins manage academic events"
    ON public.academic_events FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
