-- Add discount columns to payments and create discount approval table
CREATE TABLE IF NOT EXISTS public.pupil_discounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  semester_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pupil_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and admin can view discounts"
  ON public.pupil_discounts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role) OR has_role(auth.uid(), 'headmistress'::app_role));

CREATE POLICY "Finance and admin can insert discounts"
  ON public.pupil_discounts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'finance'::app_role));

CREATE POLICY "Admin and headmistress can update discounts"
  ON public.pupil_discounts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'headmistress'::app_role));

CREATE POLICY "Admin can delete discounts"
  ON public.pupil_discounts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pupil_discounts_updated_at
  BEFORE UPDATE ON public.pupil_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pupil_discounts_student ON public.pupil_discounts(student_id, semester_id);