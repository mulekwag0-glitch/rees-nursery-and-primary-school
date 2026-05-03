import { supabase } from '@/integrations/supabase/client';

export const ROW_HARD_CAP = 50000;
export const ROW_WARN_THRESHOLD = 5000;

export type ExportFilters = {
  semester_id?: string;
  program_id?: string;
  date_from?: string;
  date_to?: string;
};

export type ColumnDef = { key: string; label: string; default?: boolean };

function escape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCSV(
  filename: string,
  rows: Record<string, any>[],
  columns: ColumnDef[],
  summary?: Record<string, any> | null,
) {
  if (!rows.length) throw new Error('No data matches the selected filters.');
  const headers = columns.map((c) => c.label);
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(columns.map((c) => escape(r[c.key])).join(','));
  if (summary) {
    lines.push('');
    lines.push(columns.map((c) => escape(summary[c.key] ?? '')).join(','));
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function applyDateRange<T extends { gte: any; lte: any }>(q: T, col: string, f: ExportFilters): T {
  if (f.date_from) (q as any).gte(col, f.date_from);
  if (f.date_to) (q as any).lte(col, f.date_to);
  return q;
}

// ---------- PAYMENTS ----------
export const PAYMENT_COLUMNS: ColumnDef[] = [
  { key: 'Receipt', label: 'Receipt', default: true },
  { key: 'Date', label: 'Date', default: true },
  { key: 'RegNo', label: 'Reg No', default: true },
  { key: 'Pupil', label: 'Pupil Name', default: true },
  { key: 'Class', label: 'Class', default: true },
  { key: 'Term', label: 'Term', default: true },
  { key: 'Amount', label: 'Amount (UGX)', default: true },
  { key: 'Method', label: 'Method', default: true },
  { key: 'Status', label: 'Status', default: true },
  { key: 'Notes', label: 'Notes', default: false },
];

export async function fetchPayments(filters: ExportFilters) {
  let q = supabase
    .from('payments')
    .select('receipt_number, payment_date, amount, payment_method, status, notes, students:student_id (student_id, full_name, program_id, programs:program_id (name)), semesters:semester_id (name)', { count: 'exact' })
    .order('payment_date', { ascending: false })
    .limit(ROW_HARD_CAP + 1);
  if (filters.semester_id) q = q.eq('semester_id', filters.semester_id);
  if (filters.date_from) q = q.gte('payment_date', filters.date_from);
  if (filters.date_to) q = q.lte('payment_date', filters.date_to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = data || [];
  if (filters.program_id) rows = rows.filter((p: any) => p.students?.program_id === filters.program_id);
  return rows.map((p: any) => ({
    Receipt: p.receipt_number,
    Date: p.payment_date,
    RegNo: p.students?.student_id || '',
    Pupil: p.students?.full_name || '',
    Class: p.students?.programs?.name || '',
    Term: p.semesters?.name || '',
    Amount: Number(p.amount) || 0,
    Method: p.payment_method,
    Status: p.status,
    Notes: p.notes || '',
  }));
}

export function summarisePayments(rows: any[]) {
  const total = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
  const approved = rows.filter((r) => r.Status === 'approved').reduce((s, r) => s + Number(r.Amount), 0);
  const pending = rows.filter((r) => r.Status === 'pending').reduce((s, r) => s + Number(r.Amount), 0);
  return {
    Receipt: 'TOTAL',
    Pupil: `${rows.length} payments`,
    Amount: total,
    Method: `approved: ${approved.toLocaleString()} | pending: ${pending.toLocaleString()}`,
  };
}

// ---------- EXPENSES ----------
export const EXPENSE_COLUMNS: ColumnDef[] = [
  { key: 'Date', label: 'Date', default: true },
  { key: 'Title', label: 'Title', default: true },
  { key: 'Category', label: 'Category', default: true },
  { key: 'Amount', label: 'Amount (UGX)', default: true },
  { key: 'Status', label: 'Status', default: true },
  { key: 'Receipt', label: 'Receipt Ref', default: false },
  { key: 'Description', label: 'Description', default: false },
];

export async function fetchExpenses(filters: ExportFilters) {
  let q = supabase
    .from('expenses')
    .select('expense_date, title, category, amount, status, receipt_reference, description')
    .order('expense_date', { ascending: false })
    .limit(ROW_HARD_CAP + 1);
  if (filters.date_from) q = q.gte('expense_date', filters.date_from);
  if (filters.date_to) q = q.lte('expense_date', filters.date_to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((e: any) => ({
    Date: e.expense_date,
    Title: e.title,
    Category: e.category,
    Amount: Number(e.amount) || 0,
    Status: e.status,
    Receipt: e.receipt_reference || '',
    Description: e.description || '',
  }));
}

export function summariseExpenses(rows: any[]) {
  const total = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
  const approved = rows.filter((r) => r.Status === 'approved').reduce((s, r) => s + Number(r.Amount), 0);
  return {
    Date: 'TOTAL',
    Title: `${rows.length} expenses`,
    Amount: total,
    Status: `approved: ${approved.toLocaleString()}`,
  };
}

// ---------- ENROLLMENTS ----------
export const ENROLLMENT_COLUMNS: ColumnDef[] = [
  { key: 'RegNo', label: 'Reg No', default: true },
  { key: 'Pupil', label: 'Pupil Name', default: true },
  { key: 'Gender', label: 'Gender', default: true },
  { key: 'Class', label: 'Class', default: true },
  { key: 'ClassCode', label: 'Class Code', default: false },
  { key: 'Year', label: 'Year', default: true },
  { key: 'Status', label: 'Status', default: true },
  { key: 'ParentContact', label: 'Parent Contact', default: false },
  { key: 'EnrollmentDate', label: 'Enrollment Date', default: false },
];

export async function fetchEnrollments(filters: ExportFilters) {
  let q = supabase
    .from('students')
    .select('student_id, full_name, gender, current_year, status, parent_contact, enrollment_date, program_id, programs:program_id (name, code)')
    .order('full_name')
    .limit(ROW_HARD_CAP + 1);
  if (filters.program_id) q = q.eq('program_id', filters.program_id);
  if (filters.date_from) q = q.gte('enrollment_date', filters.date_from);
  if (filters.date_to) q = q.lte('enrollment_date', filters.date_to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map((s: any) => ({
    RegNo: s.student_id,
    Pupil: s.full_name,
    Gender: s.gender || '',
    Class: s.programs?.name || '',
    ClassCode: s.programs?.code || '',
    Year: s.current_year,
    Status: s.status,
    ParentContact: s.parent_contact || '',
    EnrollmentDate: s.enrollment_date,
  }));
}

export function summariseEnrollments(rows: any[]) {
  const active = rows.filter((r) => r.Status === 'active').length;
  return {
    RegNo: 'TOTAL',
    Pupil: `${rows.length} pupils`,
    Status: `active: ${active}`,
  };
}

// ---------- RESULTS ----------
export const RESULT_COLUMNS: ColumnDef[] = [
  { key: 'RegNo', label: 'Reg No', default: true },
  { key: 'Pupil', label: 'Pupil Name', default: true },
  { key: 'Class', label: 'Class', default: true },
  { key: 'SubjectCode', label: 'Subject Code', default: false },
  { key: 'Subject', label: 'Subject', default: true },
  { key: 'Term', label: 'Term', default: true },
  { key: 'Coursework', label: 'Coursework', default: true },
  { key: 'Exam', label: 'Exam', default: true },
  { key: 'Total', label: 'Total', default: true },
  { key: 'Grade', label: 'Grade', default: true },
  { key: 'GradePoint', label: 'Grade Point', default: false },
  { key: 'Status', label: 'Status', default: true },
];

export async function fetchResults(filters: ExportFilters) {
  let q = supabase
    .from('results')
    .select('coursework_marks, exam_marks, total_marks, grade, grade_point, status, student_courses:student_course_id (semester_id, students:student_id (student_id, full_name, program_id, programs:program_id (name)), courses:course_id (code, name), semesters:semester_id (name))')
    .order('updated_at', { ascending: false })
    .limit(ROW_HARD_CAP + 1);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = data || [];
  if (filters.semester_id) rows = rows.filter((r: any) => r.student_courses?.semester_id === filters.semester_id);
  if (filters.program_id) rows = rows.filter((r: any) => r.student_courses?.students?.program_id === filters.program_id);
  return rows.map((r: any) => ({
    RegNo: r.student_courses?.students?.student_id || '',
    Pupil: r.student_courses?.students?.full_name || '',
    Class: r.student_courses?.students?.programs?.name || '',
    SubjectCode: r.student_courses?.courses?.code || '',
    Subject: r.student_courses?.courses?.name || '',
    Term: r.student_courses?.semesters?.name || '',
    Coursework: Number(r.coursework_marks) || 0,
    Exam: Number(r.exam_marks) || 0,
    Total: Number(r.total_marks) || 0,
    Grade: r.grade || '',
    GradePoint: r.grade_point ?? '',
    Status: r.status,
  }));
}

export function summariseResults(rows: any[]) {
  const n = rows.length;
  const avg = n ? rows.reduce((s, r) => s + Number(r.Total || 0), 0) / n : 0;
  const passed = rows.filter((r) => r.Grade && !['F', 'F9'].includes(r.Grade)).length;
  return {
    RegNo: 'SUMMARY',
    Pupil: `${n} results`,
    Total: avg.toFixed(1),
    Grade: `pass: ${n ? Math.round((passed / n) * 100) : 0}%`,
  };
}
