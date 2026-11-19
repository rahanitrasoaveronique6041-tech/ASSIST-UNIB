ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS filiere text,
    ADD COLUMN IF NOT EXISTS niveau text;
