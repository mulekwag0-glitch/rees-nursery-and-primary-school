
-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_reference TEXT,
  recorded_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Finance and admin can view all expenses
CREATE POLICY "Finance and admin can view expenses"
ON public.expenses FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'finance'::app_role)
);

-- Finance can insert expenses
CREATE POLICY "Finance can insert expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'finance'::app_role) OR 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Finance can update own expenses, admin can update all
CREATE POLICY "Finance and admin can update expenses"
ON public.expenses FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  (public.has_role(auth.uid(), 'finance'::app_role) AND recorded_by = auth.uid())
);

-- Only admin can delete expenses
CREATE POLICY "Admin can delete expenses"
ON public.expenses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
