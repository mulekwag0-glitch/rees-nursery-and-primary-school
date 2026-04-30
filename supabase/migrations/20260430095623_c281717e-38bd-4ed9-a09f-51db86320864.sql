
-- Tutors need to see student_courses to enter results for newly admitted pupils
CREATE POLICY "Tutors can view enrollments"
ON public.student_courses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'tutor'::app_role) OR has_role(auth.uid(), 'headmistress'::app_role));

-- Uppercase all existing pupil names
UPDATE public.students SET full_name = UPPER(full_name) WHERE full_name IS NOT NULL;

-- Auto-uppercase pupil names on insert/update
CREATE OR REPLACE FUNCTION public.uppercase_student_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := UPPER(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_uppercase_name ON public.students;
CREATE TRIGGER students_uppercase_name
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.uppercase_student_name();
