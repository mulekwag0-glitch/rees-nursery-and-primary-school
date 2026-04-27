
-- 1) Ensure unique constraint exists for student_courses (needed for ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS student_courses_unique
  ON public.student_courses (student_id, course_id, semester_id);

-- 2) Back-enroll all existing pupils into their class subjects for current term
DO $$
DECLARE
  v_sem uuid;
BEGIN
  SELECT id INTO v_sem FROM public.semesters WHERE is_current = true ORDER BY start_date DESC LIMIT 1;
  IF v_sem IS NULL THEN RETURN; END IF;

  INSERT INTO public.student_courses (student_id, course_id, semester_id)
  SELECT s.id, c.id, v_sem
  FROM public.students s
  JOIN public.courses c ON c.program_id = s.program_id
  WHERE s.status = 'active'
  ON CONFLICT (student_id, course_id, semester_id) DO NOTHING;
END $$;

-- 3) Attach auto-enroll trigger to students table (covers new admissions + program changes)
DROP TRIGGER IF EXISTS students_auto_enroll ON public.students;
CREATE TRIGGER students_auto_enroll
  AFTER INSERT OR UPDATE OF program_id ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_student_in_class_subjects();

-- 4) Server-side payment edit/delete guard: block once not pending
CREATE OR REPLACE FUNCTION public.guard_payment_modifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Once approved/rejected, lock the record (admin can still flip status via separate logic)
    IF OLD.status <> 'pending' AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'Payment % is locked (status: %); edits are not allowed', OLD.receipt_number, OLD.status;
    END IF;
    -- Receipt number cannot change
    IF NEW.receipt_number IS DISTINCT FROM OLD.receipt_number THEN
      RAISE EXCEPTION 'Receipt number cannot be modified';
    END IF;
    -- Amount must be positive
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Cannot delete a % payment', OLD.status;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;
    IF NEW.receipt_number IS NULL OR length(trim(NEW.receipt_number)) = 0 THEN
      RAISE EXCEPTION 'Receipt number is required';
    END IF;
    -- Enforce uniqueness defensively
    IF EXISTS (SELECT 1 FROM public.payments WHERE receipt_number = NEW.receipt_number) THEN
      RAISE EXCEPTION 'Duplicate receipt number: %', NEW.receipt_number;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS payments_guard ON public.payments;
CREATE TRIGGER payments_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_modifications();
