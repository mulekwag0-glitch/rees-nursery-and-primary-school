-- Replace generated total_marks with a plain numeric column the user can write directly,
-- then auto-calculate grade & grade_point via a trigger using the Uganda grading bands.

-- 1. Drop the generated column (we will recreate as plain numeric)
ALTER TABLE public.results DROP COLUMN total_marks;
ALTER TABLE public.results ADD COLUMN total_marks numeric;

-- 2. Trigger function: derive grade based on the pupil's class level (lower vs upper primary)
CREATE OR REPLACE FUNCTION public.results_set_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level text := 'lower';
  v_program_code text;
  v_marks numeric;
BEGIN
  -- Look up the pupil's program code via student_courses -> students -> programs
  SELECT p.code INTO v_program_code
  FROM public.student_courses sc
  JOIN public.students st ON st.id = sc.student_id
  JOIN public.programs p ON p.id = st.program_id
  WHERE sc.id = NEW.student_course_id;

  IF v_program_code IN ('P4','P5','P6','P7') THEN
    v_level := 'upper';
  END IF;

  v_marks := COALESCE(NEW.total_marks, 0);

  IF v_level = 'upper' THEN
    IF v_marks >= 95 THEN NEW.grade := 'D1'; NEW.grade_point := 1;
    ELSIF v_marks >= 80 THEN NEW.grade := 'D2'; NEW.grade_point := 2;
    ELSIF v_marks >= 60 THEN NEW.grade := 'C3'; NEW.grade_point := 3;
    ELSIF v_marks >= 55 THEN NEW.grade := 'C4'; NEW.grade_point := 4;
    ELSIF v_marks >= 50 THEN NEW.grade := 'C6'; NEW.grade_point := 6;
    ELSIF v_marks >= 45 THEN NEW.grade := 'P7'; NEW.grade_point := 7;
    ELSIF v_marks >= 40 THEN NEW.grade := 'P8'; NEW.grade_point := 8;
    ELSE NEW.grade := 'F9'; NEW.grade_point := 9;
    END IF;
  ELSE
    IF v_marks >= 90 THEN NEW.grade := 'D1'; NEW.grade_point := 1;
    ELSIF v_marks >= 80 THEN NEW.grade := 'D2'; NEW.grade_point := 2;
    ELSIF v_marks >= 60 THEN NEW.grade := 'C3'; NEW.grade_point := 3;
    ELSIF v_marks >= 55 THEN NEW.grade := 'C4'; NEW.grade_point := 4;
    ELSIF v_marks >= 50 THEN NEW.grade := 'C6'; NEW.grade_point := 6;
    ELSIF v_marks >= 45 THEN NEW.grade := 'P7'; NEW.grade_point := 7;
    ELSIF v_marks >= 40 THEN NEW.grade := 'P8'; NEW.grade_point := 8;
    ELSE NEW.grade := 'F9'; NEW.grade_point := 9;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS results_set_grade_trg ON public.results;
CREATE TRIGGER results_set_grade_trg
BEFORE INSERT OR UPDATE OF total_marks ON public.results
FOR EACH ROW
EXECUTE FUNCTION public.results_set_grade();