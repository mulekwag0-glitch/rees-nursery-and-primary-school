import { supabase } from '@/integrations/supabase/client';

function escape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) {
    alert('No data to export.');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportPaymentsCSV() {
  const { data, error } = await supabase
    .from('payments')
    .select('receipt_number, payment_date, amount, payment_method, status, notes, students:student_id (student_id, full_name, programs:program_id (name)), semesters:semester_id (name)')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  const rows = (data || []).map((p: any) => ({
    Receipt: p.receipt_number,
    Date: p.payment_date,
    'Reg No': p.students?.student_id || '',
    'Pupil Name': p.students?.full_name || '',
    Class: p.students?.programs?.name || '',
    Term: p.semesters?.name || '',
    'Amount (UGX)': p.amount,
    Method: p.payment_method,
    Status: p.status,
    Notes: p.notes || '',
  }));
  downloadCSV('payments_report', rows);
}

export async function exportEnrollmentsCSV() {
  const { data, error } = await supabase
    .from('students')
    .select('student_id, full_name, gender, current_year, status, parent_contact, enrollment_date, programs:program_id (name, code)')
    .order('full_name');
  if (error) throw error;
  const rows = (data || []).map((s: any) => ({
    'Reg No': s.student_id,
    'Pupil Name': s.full_name,
    Gender: s.gender || '',
    Class: s.programs?.name || '',
    'Class Code': s.programs?.code || '',
    Year: s.current_year,
    Status: s.status,
    'Parent Contact': s.parent_contact || '',
    'Enrollment Date': s.enrollment_date,
  }));
  downloadCSV('enrollments_report', rows);
}

export async function exportResultsCSV() {
  const { data, error } = await supabase
    .from('results')
    .select('coursework_marks, exam_marks, total_marks, grade, grade_point, status, updated_at, student_courses:student_course_id (students:student_id (student_id, full_name, programs:program_id (name)), courses:course_id (code, name), semesters:semester_id (name))')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = (data || []).map((r: any) => ({
    'Reg No': r.student_courses?.students?.student_id || '',
    'Pupil Name': r.student_courses?.students?.full_name || '',
    Class: r.student_courses?.students?.programs?.name || '',
    'Subject Code': r.student_courses?.courses?.code || '',
    Subject: r.student_courses?.courses?.name || '',
    Term: r.student_courses?.semesters?.name || '',
    Coursework: r.coursework_marks ?? 0,
    Exam: r.exam_marks ?? 0,
    Total: r.total_marks ?? 0,
    Grade: r.grade || '',
    'Grade Point': r.grade_point ?? '',
    Status: r.status,
  }));
  downloadCSV('results_report', rows);
}
