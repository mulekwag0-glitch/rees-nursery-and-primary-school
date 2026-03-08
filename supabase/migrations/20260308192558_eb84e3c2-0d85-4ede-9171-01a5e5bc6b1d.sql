
CREATE TABLE public.document_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  generated_by uuid NOT NULL,
  student_name text NOT NULL,
  student_number text NOT NULL,
  program_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document logs"
ON public.document_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Finance can view document logs"
ON public.document_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'finance'::public.app_role));
