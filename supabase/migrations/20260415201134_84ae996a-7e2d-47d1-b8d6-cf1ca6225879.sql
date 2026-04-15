
DROP POLICY "Staff can insert store items" ON public.store_items;
CREATE POLICY "Staff can insert store items" ON public.store_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance'));

DROP POLICY "Staff can insert health" ON public.health_records;
CREATE POLICY "Staff can insert health" ON public.health_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'tutor'));

DROP POLICY "Staff can insert minutes" ON public.meeting_minutes;
CREATE POLICY "Staff can insert minutes" ON public.meeting_minutes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
