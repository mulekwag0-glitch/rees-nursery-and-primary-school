-- Students: headmistress can view all students
CREATE POLICY "Headmistress can view students"
ON public.students FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Courses: headmistress can view
CREATE POLICY "Headmistress can view courses"
ON public.courses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Results: headmistress can view and approve
CREATE POLICY "Headmistress can manage results"
ON public.results FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Attendance: headmistress can view
CREATE POLICY "Headmistress can view attendance"
ON public.attendance FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Document logs: headmistress can view and insert
CREATE POLICY "Headmistress can manage document logs"
ON public.document_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Profiles: headmistress can view all
CREATE POLICY "Headmistress can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Lesson plans: headmistress can view
CREATE POLICY "Headmistress can view lesson plans"
ON public.lesson_plans FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));

-- Schemes: headmistress can view
CREATE POLICY "Headmistress can view schemes"
ON public.schemes_of_work FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'headmistress'::app_role));