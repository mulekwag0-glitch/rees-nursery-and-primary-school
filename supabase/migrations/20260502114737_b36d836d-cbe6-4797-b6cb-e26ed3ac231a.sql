-- Audit trail for results changes
CREATE TABLE IF NOT EXISTS public.results_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid,
  student_course_id uuid NOT NULL,
  action text NOT NULL,
  old_total numeric,
  new_total numeric,
  old_status text,
  new_status text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_audit_sc ON public.results_audit(student_course_id, changed_at DESC);

ALTER TABLE public.results_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage results audit"
  ON public.results_audit FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'headmistress'::app_role));

CREATE POLICY "Tutors view results audit"
  ON public.results_audit FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tutor'::app_role));

CREATE OR REPLACE FUNCTION public.log_results_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.results_audit(result_id, student_course_id, action, new_total, new_status, changed_by)
    VALUES (NEW.id, NEW.student_course_id, 'insert', NEW.total_marks, NEW.status::text, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.total_marks IS DISTINCT FROM OLD.total_marks OR NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.results_audit(result_id, student_course_id, action, old_total, new_total, old_status, new_status, changed_by)
      VALUES (NEW.id, NEW.student_course_id, 'update', OLD.total_marks, NEW.total_marks, OLD.status::text, NEW.status::text, auth.uid());
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.results_audit(result_id, student_course_id, action, old_total, old_status, changed_by)
    VALUES (OLD.id, OLD.student_course_id, 'delete', OLD.total_marks, OLD.status::text, auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS results_audit_trigger ON public.results;
CREATE TRIGGER results_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.log_results_change();