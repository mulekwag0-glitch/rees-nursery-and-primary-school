-- =========================================
-- 1. PAYMENTS APPROVAL WORKFLOW
-- =========================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies: only admin can update/delete; finance can insert their own; finance can update only PENDING ones they recorded
DROP POLICY IF EXISTS "Finance can update own pending payments" ON public.payments;
CREATE POLICY "Finance can update own pending payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'finance'::app_role)
  AND recorded_by = auth.uid()
  AND status = 'pending'
)
WITH CHECK (
  has_role(auth.uid(), 'finance'::app_role)
  AND status = 'pending'
);

DROP POLICY IF EXISTS "Finance can delete own pending payments" ON public.payments;
CREATE POLICY "Finance can delete own pending payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'finance'::app_role)
  AND recorded_by = auth.uid()
  AND status = 'pending'
);

-- =========================================
-- 2. STOCK ITEMS (POS)
-- =========================================
CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text,
  category text NOT NULL DEFAULT 'uniform',
  quantity integer NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 5,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance and admin can view stock" ON public.stock_items;
CREATE POLICY "Finance and admin can view stock"
ON public.stock_items FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role));

DROP POLICY IF EXISTS "Finance and admin can manage stock" ON public.stock_items;
CREATE POLICY "Finance and admin can manage stock"
ON public.stock_items FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role));

DROP TRIGGER IF EXISTS stock_items_updated_at ON public.stock_items;
CREATE TRIGGER stock_items_updated_at
BEFORE UPDATE ON public.stock_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3. STOCK SALES (POS receipts, linked to pupil)
-- =========================================
CREATE TABLE IF NOT EXISTS public.stock_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  student_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  notes text,
  sold_by uuid NOT NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance and admin can view sales" ON public.stock_sales;
CREATE POLICY "Finance and admin can view sales"
ON public.stock_sales FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role));

DROP POLICY IF EXISTS "Finance and admin can record sales" ON public.stock_sales;
CREATE POLICY "Finance and admin can record sales"
ON public.stock_sales FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'finance'::app_role));

DROP POLICY IF EXISTS "Admin can manage sales" ON public.stock_sales;
CREATE POLICY "Admin can manage sales"
ON public.stock_sales FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- =========================================
-- 4. AUTO-ENROLL ON ADMISSION
-- Trigger: when a student is inserted, enroll them in every course of their class for current term(s)
-- =========================================
CREATE OR REPLACE FUNCTION public.auto_enroll_student_in_class_subjects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_courses (student_id, course_id, semester_id)
  SELECT NEW.id, c.id, s.id
  FROM public.courses c
  CROSS JOIN public.semesters s
  WHERE c.program_id = NEW.program_id
    AND s.is_current = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_auto_enroll ON public.students;
CREATE TRIGGER students_auto_enroll
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_student_in_class_subjects();
