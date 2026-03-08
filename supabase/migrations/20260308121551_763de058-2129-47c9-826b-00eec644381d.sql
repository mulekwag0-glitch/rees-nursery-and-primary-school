
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    read boolean NOT NULL DEFAULT false,
    link text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'finance') OR has_role(auth.uid(), 'tutor'));

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
