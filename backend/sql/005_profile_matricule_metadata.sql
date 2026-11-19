CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, role, matricule)
    VALUES (
        NEW.id,
        'student',
        NULLIF(upper(trim(NEW.raw_user_meta_data ->> 'matricule')), '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;
