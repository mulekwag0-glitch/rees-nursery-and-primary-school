CREATE OR REPLACE FUNCTION public.validate_student_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Program is always required
  IF NEW.program_id IS NULL THEN
    RAISE EXCEPTION 'A class/program is required for every pupil';
  END IF;

  -- Status must be one of the allowed values (also enforced by enum, defensive)
  IF NEW.status::text NOT IN ('active','inactive','graduated','suspended') THEN
    RAISE EXCEPTION 'Invalid pupil status: %', NEW.status;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Graduated is a final state
    IF OLD.status::text = 'graduated' AND NEW.status::text <> 'graduated' THEN
      RAISE EXCEPTION 'A graduated pupil cannot be reactivated. Re-admit instead.';
    END IF;

    -- Class can only be changed while pupil is active
    IF NEW.program_id IS DISTINCT FROM OLD.program_id
       AND OLD.status::text <> 'active' THEN
      RAISE EXCEPTION 'Class can only be changed while the pupil is ACTIVE (current status: %)', OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_student_status ON public.students;
CREATE TRIGGER trg_validate_student_status
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.validate_student_status_transition();
