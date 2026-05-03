-- Trigger function to sync enrollments when pupil status or program changes
CREATE OR REPLACE FUNCTION public.sync_student_enrollments_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_semester_id uuid;
BEGIN
  -- Only react when status or program_id actually changed
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.program_id IS NOT DISTINCT FROM OLD.program_id THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_semester_id
  FROM public.semesters
  WHERE is_current = true
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_semester_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- If pupil is now active, ensure they are enrolled in current-term subjects
  IF NEW.status = 'active' THEN
    -- If class changed, remove current-term enrollments from the OLD program
    -- but only where no results have been entered yet
    IF NEW.program_id IS DISTINCT FROM OLD.program_id THEN
      DELETE FROM public.student_courses sc
      WHERE sc.student_id = NEW.id
        AND sc.semester_id = v_semester_id
        AND sc.course_id IN (SELECT id FROM public.courses WHERE program_id = OLD.program_id)
        AND NOT EXISTS (
          SELECT 1 FROM public.results r
          WHERE r.student_course_id = sc.id
            AND COALESCE(r.total_marks, 0) > 0
        );
    END IF;

    INSERT INTO public.student_courses (student_id, course_id, semester_id)
    SELECT NEW.id, c.id, v_semester_id
    FROM public.courses c
    WHERE c.program_id = NEW.program_id
    ON CONFLICT (student_id, course_id, semester_id) DO NOTHING;

  -- If pupil moved to inactive/graduated/suspended, drop current-term
  -- enrollments that have no marks recorded yet (preserve history)
  ELSIF NEW.status IN ('inactive','graduated','suspended') THEN
    DELETE FROM public.student_courses sc
    WHERE sc.student_id = NEW.id
      AND sc.semester_id = v_semester_id
      AND NOT EXISTS (
        SELECT 1 FROM public.results r
        WHERE r.student_course_id = sc.id
          AND COALESCE(r.total_marks, 0) > 0
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_enrollments ON public.students;
CREATE TRIGGER trg_sync_student_enrollments
AFTER UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_enrollments_on_change();

-- Ensure ON CONFLICT target exists (referenced by both triggers)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_student_courses_per_term
ON public.student_courses (student_id, course_id, semester_id);
