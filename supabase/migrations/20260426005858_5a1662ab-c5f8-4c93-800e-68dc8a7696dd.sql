
-- 1) Tighten audit_logs INSERT policy (fix linter "always true")
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Make student-photos bucket private and restrict SELECT
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';

DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;
CREATE POLICY "Staff can view student photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-photos' AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'finance'::app_role) OR
      public.has_role(auth.uid(), 'tutor'::app_role) OR
      public.has_role(auth.uid(), 'headmistress'::app_role)
    )
  );

-- 3) Harden auto-enroll trigger: current term only, dedupe via ON CONFLICT
CREATE OR REPLACE FUNCTION public.auto_enroll_student_in_class_subjects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_semester_id uuid;
BEGIN
  SELECT id INTO v_semester_id
  FROM public.semesters
  WHERE is_current = true
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_semester_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.student_courses (student_id, course_id, semester_id)
  SELECT NEW.id, c.id, v_semester_id
  FROM public.courses c
  WHERE c.program_id = NEW.program_id
  ON CONFLICT (student_id, course_id, semester_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 4) Stock floor: quantity >= 0
ALTER TABLE public.stock_items
  DROP CONSTRAINT IF EXISTS stock_items_quantity_nonneg;
ALTER TABLE public.stock_items
  ADD CONSTRAINT stock_items_quantity_nonneg CHECK (quantity >= 0);

-- 5) Atomic POS sale: validates stock, decrements, generates unique receipt
CREATE OR REPLACE FUNCTION public.create_stock_sale(
  _student_id uuid,
  _items jsonb,
  _payment_method text,
  _notes text DEFAULT NULL
)
RETURNS public.stock_sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  line jsonb;
  v_item record;
  v_total numeric := 0;
  v_qty integer;
  v_receipt text;
  v_seq integer;
  v_sale public.stock_sales;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'finance'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed to record sales';
  END IF;

  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Validate + lock rows + decrement
  FOR line IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (line->>'qty')::int;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity in cart';
    END IF;

    SELECT id, name, quantity, selling_price
      INTO v_item
    FROM public.stock_items
    WHERE id = (line->>'item_id')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock item not found: %', line->>'item_id';
    END IF;

    IF v_item.quantity < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %: only % available', v_item.name, v_item.quantity;
    END IF;

    v_total := v_total + (v_qty * v_item.selling_price);

    UPDATE public.stock_items
       SET quantity = quantity - v_qty, updated_at = now()
     WHERE id = v_item.id;
  END LOOP;

  -- Generate sequential receipt number for the day
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(receipt_number, '^POS-\d{8}-', ''), '')::int
  ), 0) + 1
  INTO v_seq
  FROM public.stock_sales
  WHERE sale_date = CURRENT_DATE
    AND receipt_number ~ ('^POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-\d+$');

  v_receipt := 'POS-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.stock_sales (
    receipt_number, student_id, items, total_amount, payment_method, notes, sold_by
  ) VALUES (
    v_receipt, _student_id, _items, v_total, COALESCE(_payment_method, 'cash'), _notes, auth.uid()
  ) RETURNING * INTO v_sale;

  RETURN v_sale;
END;
$$;

-- Allow signed-in finance/admin to call it
REVOKE ALL ON FUNCTION public.create_stock_sale(uuid, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stock_sale(uuid, jsonb, text, text) TO authenticated;
