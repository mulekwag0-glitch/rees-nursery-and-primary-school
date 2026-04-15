
-- Schemes of Work
CREATE TABLE public.schemes_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL DEFAULT 1,
  topic TEXT NOT NULL,
  objectives TEXT,
  activities TEXT,
  resources TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schemes_of_work ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage schemes" ON public.schemes_of_work FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage schemes" ON public.schemes_of_work FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'tutor'));
CREATE POLICY "Staff can view schemes" ON public.schemes_of_work FOR SELECT TO authenticated USING (true);

-- Lesson Plans
CREATE TABLE public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  objectives TEXT,
  activities TEXT,
  resources TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage lesson plans" ON public.lesson_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage own plans" ON public.lesson_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'tutor'));
CREATE POLICY "Staff can view plans" ON public.lesson_plans FOR SELECT TO authenticated USING (true);

-- Timetable Entries
CREATE TABLE public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT,
  room TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage timetable" ON public.timetable_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view timetable" ON public.timetable_entries FOR SELECT TO authenticated USING (true);

-- PTA Meetings
CREATE TABLE public.pta_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  attendees_count INTEGER DEFAULT 0,
  minutes TEXT,
  resolutions TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pta_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage PTA" ON public.pta_meetings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view PTA" ON public.pta_meetings FOR SELECT TO authenticated USING (true);

-- Staff Appraisals
CREATE TABLE public.staff_appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  appraisal_period TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 3,
  strengths TEXT,
  improvements TEXT,
  recommendations TEXT,
  appraised_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage appraisals" ON public.staff_appraisals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view appraisals" ON public.staff_appraisals FOR SELECT TO authenticated USING (true);

-- Store Items
CREATE TABLE public.store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'other',
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage store" ON public.store_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finance can view store" ON public.store_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Staff can insert store items" ON public.store_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can view store" ON public.store_items FOR SELECT TO authenticated USING (true);

-- School Assets
CREATE TABLE public.school_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  asset_value NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  condition TEXT NOT NULL DEFAULT 'good',
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage assets" ON public.school_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view assets" ON public.school_assets FOR SELECT TO authenticated USING (true);

-- Health Records
CREATE TABLE public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pupil_name TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'incident',
  details TEXT,
  medication TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage health" ON public.health_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view health" ON public.health_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert health" ON public.health_records FOR INSERT TO authenticated WITH CHECK (true);

-- Meeting Minutes (general)
CREATE TABLE public.meeting_minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_type TEXT NOT NULL,
  minutes TEXT NOT NULL,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage minutes" ON public.meeting_minutes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view minutes" ON public.meeting_minutes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert minutes" ON public.meeting_minutes FOR INSERT TO authenticated WITH CHECK (true);

-- Attendance
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'tutor'));
CREATE POLICY "Staff can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_schemes_updated_at BEFORE UPDATE ON public.schemes_of_work FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pta_updated_at BEFORE UPDATE ON public.pta_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appraisals_updated_at BEFORE UPDATE ON public.staff_appraisals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_updated_at BEFORE UPDATE ON public.store_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.school_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_health_updated_at BEFORE UPDATE ON public.health_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_minutes_updated_at BEFORE UPDATE ON public.meeting_minutes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
