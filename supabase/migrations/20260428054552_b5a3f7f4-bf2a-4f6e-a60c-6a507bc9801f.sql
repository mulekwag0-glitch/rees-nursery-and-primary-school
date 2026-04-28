-- 1) Prevent duplicate profile rows (defense in depth — id is PK already, but enforce email uniqueness too)
DELETE FROM public.profiles a
USING public.profiles b
WHERE a.ctid < b.ctid
  AND lower(a.email) = lower(b.email);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_ci
  ON public.profiles (lower(email));

-- 2) Lock SECURITY DEFINER functions so anon cannot call them (linter WARN 0028)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_module_access(uuid, text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.get_module_access(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_grade(numeric) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.calculate_grade(numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_grade(numeric, text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.calculate_grade(numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_stock_sale(uuid, jsonb, text, text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.create_stock_sale(uuid, jsonb, text, text) TO authenticated;

-- Trigger-only functions never need direct callers
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                        FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()               FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_enroll_student_in_class_subjects()  FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_payment_modifications()            FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.results_set_grade()                      FROM anon, public, authenticated;

-- 3) Tighten RLS — finance role should NOT see academic / HR-only data
-- Pattern: replace `USING (true)` policies with role-scoped ones that exclude finance.

-- attendance
DROP POLICY IF EXISTS "Staff can view attendance" ON public.attendance;
CREATE POLICY "Staff can view attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- lesson_plans
DROP POLICY IF EXISTS "Staff can view plans" ON public.lesson_plans;
CREATE POLICY "Staff can view plans" ON public.lesson_plans
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- schemes_of_work
DROP POLICY IF EXISTS "Staff can view schemes" ON public.schemes_of_work;
CREATE POLICY "Staff can view schemes" ON public.schemes_of_work
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- timetable_entries
DROP POLICY IF EXISTS "Staff can view timetable" ON public.timetable_entries;
CREATE POLICY "Staff can view timetable" ON public.timetable_entries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- health_records (HR/medical — not for finance)
DROP POLICY IF EXISTS "Staff can view health" ON public.health_records;
CREATE POLICY "Staff can view health" ON public.health_records
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- meeting_minutes (governance — not for finance)
DROP POLICY IF EXISTS "Staff can view minutes" ON public.meeting_minutes;
CREATE POLICY "Staff can view minutes" ON public.meeting_minutes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- pta_meetings (governance)
DROP POLICY IF EXISTS "Staff can view PTA" ON public.pta_meetings;
CREATE POLICY "Staff can view PTA" ON public.pta_meetings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- staff_appraisals (HR — not for finance)
DROP POLICY IF EXISTS "Staff can view appraisals" ON public.staff_appraisals;
CREATE POLICY "Staff can view appraisals" ON public.staff_appraisals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'headmistress'::app_role)
  );

-- school_assets — keep finance access (asset value matters for accounting)
-- store_items already restricts to admin/finance via existing policies — keep as is.

-- 4) Position ranking — add deterministic tie-break helper (sum totals, then sum grade points, then student id)
-- Just done in app code; nothing to migrate.

-- 5) Re-grant only what app needs
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
