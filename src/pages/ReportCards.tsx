import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  FileText, Download, Search, Loader2, Users, Printer,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import reesLogo from '@/assets/rees-logo.png';
import { QRCodeSVG } from 'qrcode.react';

// Uganda New Curriculum competency ratings
const COMPETENCY_RATINGS = [
  { code: 'BE', label: 'Beyond Expectation', color: 'bg-green-100 text-green-800' },
  { code: 'AE', label: 'Above Expectation', color: 'bg-blue-100 text-blue-800' },
  { code: 'ME', label: 'Meeting Expectation', color: 'bg-yellow-100 text-yellow-800' },
  { code: 'BW', label: 'Below Expectation', color: 'bg-red-100 text-red-800' },
];

const getCompetencyFromScore = (score: number): string => {
  if (score >= 80) return 'BE';
  if (score >= 65) return 'AE';
  if (score >= 50) return 'ME';
  return 'BW';
};

const getCompetencyColor = (code: string) => {
  return COMPETENCY_RATINGS.find(r => r.code === code)?.color || '';
};

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  gender: string;
  current_year: number;
  enrollment_date: string;
  parent_contact: string | null;
  programs: { name: string; code: string; duration_years: number };
}

interface ResultWithDetails {
  id: string;
  coursework_marks: number | null;
  exam_marks: number | null;
  total_marks: number | null;
  grade: string | null;
  grade_point: number | null;
  status: string;
  student_courses: {
    courses: { code: string; name: string; credit_units: number };
    semesters: { name: string; semester_number: number; academic_years: { name: string } };
  };
}

export default function ReportCards() {
  const { toast } = useToast();
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [showReportCard, setShowReportCard] = useState(false);
  const [studentResults, setStudentResults] = useState<ResultWithDetails[]>([]);
  const [allTermResults, setAllTermResults] = useState<ResultWithDetails[]>([]);
  const [classPosition, setClassPosition] = useState<{ position: number; total: number; average: number; grandTotal: number } | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [teacherComment, setTeacherComment] = useState('Good performance. Keep it up!');
  const [headComment, setHeadComment] = useState('Well done. Continue working hard.');
  const [conduct, setConduct] = useState('Good');
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, total: 0 });
  const reportCardRef = useRef<HTMLDivElement>(null);

  // Subjects in the currently-viewed term that have no total marks recorded yet.
  const missingSubjects = useMemo(
    () =>
      studentResults
        .filter(r => r.total_marks === null || r.total_marks === undefined)
        .map(r => r.student_courses.courses?.name || 'Unknown'),
    [studentResults]
  );
  const reportIncomplete = missingSubjects.length > 0;

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['all-students-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`id, student_id, full_name, gender, current_year, enrollment_date, parent_contact, program_id,
          programs(name, code, duration_years)`)
        .order('student_id');
      if (error) throw error;
      return data as unknown as (Student & { program_id: string })[];
    },
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ['semesters-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, semester_number, is_current, academic_year_id, academic_years:academic_year_id(name)')
        .order('semester_number');
      if (error) throw error;
      return data;
    },
  });

  // Auto-select the current term once semesters are loaded
  useEffect(() => {
    if (!selectedTerm && semesters.length) {
      const current = semesters.find((s: any) => s.is_current) || semesters[0];
      if (current) setSelectedTerm(current.name);
    }
  }, [semesters, selectedTerm]);

  const fetchStudentResults = async (studentId: string) => {
    // Fetch every enrollment + its subject + its semester, then left-join results
    const { data: scData } = await supabase
      .from('student_courses')
      .select(`id,
        courses(code, name, credit_units),
        semesters(name, semester_number, academic_years(name))`)
      .eq('student_id', studentId);
    if (!scData?.length) return [];

    const { data: resData } = await supabase
      .from('results')
      .select('id, coursework_marks, exam_marks, total_marks, grade, grade_point, status, student_course_id')
      .in('student_course_id', scData.map((sc: any) => sc.id));

    const byScId = new Map<string, any>();
    (resData || []).forEach((r: any) => byScId.set(r.student_course_id, r));

    // Build a result-shaped row for every enrolled subject, even if no marks yet
    return scData.map((sc: any) => {
      const r = byScId.get(sc.id);
      return {
        id: r?.id || `pending-${sc.id}`,
        coursework_marks: r?.coursework_marks ?? null,
        exam_marks: r?.exam_marks ?? null,
        total_marks: r?.total_marks ?? null,
        grade: r?.grade ?? null,
        grade_point: r?.grade_point ?? null,
        status: r?.status ?? 'pending',
        student_courses: { courses: sc.courses, semesters: sc.semesters },
      };
    }) as unknown as ResultWithDetails[];
  };

  const computeClassPosition = async (studentId: string, programId: string, termName: string) => {
    if (!termName || termName === 'all') return null;
    const { data: classmates } = await supabase
      .from('students')
      .select('id')
      .eq('program_id', programId);
    if (!classmates?.length) return null;

    const { data: scs } = await supabase
      .from('student_courses')
      .select('id, student_id')
      .in('student_id', classmates.map(c => c.id));
    if (!scs?.length) return null;

    const { data: rows } = await supabase
      .from('results')
      .select(`total_marks, student_course_id, student_courses!inner(student_id, semesters!inner(name))`)
      .eq('status', 'approved')
      .in('student_course_id', scs.map(s => s.id));

    // Sum of all subject totals (each out of 100) per pupil, plus subject count for averaging.
    const sums: Record<string, { total: number; count: number }> = {};
    (rows || []).forEach((r: any) => {
      if (r.student_courses?.semesters?.name !== termName) return;
      const sid = r.student_courses.student_id;
      if (!sums[sid]) sums[sid] = { total: 0, count: 0 };
      sums[sid].total += Number(r.total_marks || 0);
      sums[sid].count += 1;
    });

    // Rank by SUM of totals across all subjects (the user requested grand-total ranking).
    const ranked = Object.entries(sums)
      .map(([sid, v]) => ({ sid, total: v.total, avg: v.count ? v.total / v.count : 0 }))
      .sort((a, b) => b.total - a.total);

    const idx = ranked.findIndex(r => r.sid === studentId);
    if (idx === -1) return null;
    return {
      position: idx + 1,
      total: ranked.length,
      average: ranked[idx].avg,
      grandTotal: ranked[idx].total,
    };
  };

  const handleViewReportCard = async (studentId: string) => {
    setSelectedStudent(studentId);
    const results = await fetchStudentResults(studentId);
    setAllTermResults(results);
    const filtered = selectedTerm
      ? results.filter(r => r.student_courses.semesters.name === selectedTerm)
      : results;
    setStudentResults(filtered);

    const student = students.find(s => s.id === studentId) as any;
    if (student?.program_id && selectedTerm) {
      const pos = await computeClassPosition(studentId, student.program_id, selectedTerm);
      setClassPosition(pos);
    } else {
      setClassPosition(null);
    }

    setShowReportCard(true);
  };

  const getSelectedStudentData = () => students.find(s => s.id === selectedStudent);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleExportPDF = async () => {
    if (!reportCardRef.current) return;
    if (reportIncomplete) {
      toast({
        title: 'Cannot generate report card',
        description: `Missing marks for: ${missingSubjects.join(', ')}. Enter and approve all marks first.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      toast({ title: 'Generating PDF...', description: 'Please wait.' });
      const canvas = await html2canvas(reportCardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();
        while (position < pdfHeight) {
          pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, pdfHeight);
          position += pageHeight;
          if (position < pdfHeight) pdf.addPage();
        }
      }
      const studentData = getSelectedStudentData();
      pdf.save(`report_card_${studentData?.student_id || 'unknown'}_${selectedTerm || 'term1'}.pdf`);
      toast({ title: 'PDF Downloaded', description: 'Report card saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedStudents.size === 0) return;
    setBatchGenerating(true);
    const skipped: string[] = [];
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirst = true;

      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        const results = await fetchStudentResults(studentId);
        const filtered = selectedTerm
          ? results.filter(r => r.student_courses.semesters.name === selectedTerm)
          : results;

        // Skip pupils whose subjects are not fully marked yet.
        const missing = filtered.filter(r => r.total_marks === null || r.total_marks === undefined);
        if (filtered.length === 0 || missing.length > 0) {
          skipped.push(`${student.full_name} (${missing.length || 'no'} subject${missing.length === 1 ? '' : 's'} pending)`);
          continue;
        }

        if (!isFirst) pdf.addPage();
        isFirst = false;

        let y = 15;
        const pw = pdf.internal.pageSize.getWidth();

        // Header
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REES DAYCARE NURSERY & PRIMARY SCHOOL', pw / 2, y, { align: 'center' });
        y += 6;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Mbale City, Uganda | Tel: 0772379888/0706583860/0782063563 | Email: reesnursery@gmail.com', pw / 2, y, { align: 'center' });
        y += 5;
        pdf.text('"With God We Can"', pw / 2, y, { align: 'center' });
        y += 8;

        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REPORT CARD', pw / 2, y, { align: 'center' });
        y += 8;

        pdf.setDrawColor(185, 28, 28);
        pdf.setLineWidth(0.5);
        pdf.line(15, y, pw - 15, y);
        y += 8;

        // Student info
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Name: ${student.full_name}`, 15, y);
        pdf.text(`Reg No: ${student.student_id}`, pw / 2, y);
        y += 6;
        pdf.text(`Class: ${student.programs.name}`, 15, y);
        pdf.text(`Term: ${selectedTerm || 'Term 1'}`, pw / 2, y);
        y += 10;

        // Subjects table
        if (filtered.length > 0) {
          const headers = ['Subject', 'CW', 'Exam', 'Total', 'Rating'];
          const colWidths = [70, 20, 20, 20, 30];
          let x = 15;

          pdf.setFillColor(185, 28, 28);
          pdf.rect(15, y, pw - 30, 8, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          headers.forEach((h, i) => {
            pdf.text(h, x + 2, y + 5.5);
            x += colWidths[i];
          });
          y += 8;
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'normal');

          filtered.forEach(r => {
            x = 15;
            const competency = getCompetencyFromScore(r.total_marks || 0);
            pdf.text(r.student_courses.courses.name.substring(0, 30), x + 2, y + 5);
            x += colWidths[0];
            pdf.text(String(r.coursework_marks || 0), x + 2, y + 5);
            x += colWidths[1];
            pdf.text(String(r.exam_marks || 0), x + 2, y + 5);
            x += colWidths[2];
            pdf.text(String(r.total_marks || 0), x + 2, y + 5);
            x += colWidths[3];
            pdf.text(competency, x + 2, y + 5);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(15, y + 7, pw - 15, y + 7);
            y += 7;
          });
          y += 5;
        }

        // Comments
        y += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Conduct:', 15, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(conduct, 45, y);
        y += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Attendance:', 15, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${attendance.present}/${attendance.total} days`, 48, y);
        y += 8;
        pdf.setFont('helvetica', 'bold');
        pdf.text("Class Teacher's Comment:", 15, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text(teacherComment, 15, y);
        y += 8;
        pdf.setFont('helvetica', 'bold');
        pdf.text("Headmistress's Comment:", 15, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text(headComment, 15, y);

        // Key
        y += 12;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key: BE = Beyond Expectation | AE = Above Expectation | ME = Meeting Expectation | BW = Below Expectation', 15, y);
      }

      pdf.save(`batch_report_cards_${selectedTerm || 'term1'}.pdf`);
      const generated = selectedStudents.size - skipped.length;
      toast({
        title: skipped.length ? 'Batch generated with skips' : 'Batch PDF Downloaded',
        description: skipped.length
          ? `${generated} generated. Skipped (awaiting marks): ${skipped.join('; ')}`
          : `${generated} report cards generated.`,
        variant: skipped.length ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate batch PDFs', variant: 'destructive' });
    } finally {
      setBatchGenerating(false);
    }
  };

  const studentData = getSelectedStudentData();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Report Cards</h1>
            <p className="text-muted-foreground">Generate and download Uganda new curriculum report cards</p>
          </div>
          <div className="flex gap-2">
            <Button variant={batchMode ? 'default' : 'outline'} onClick={() => { setBatchMode(!batchMode); setSelectedStudents(new Set()); }}>
              <Users className="w-4 h-4 mr-2" />
              {batchMode ? 'Exit Batch' : 'Batch Mode'}
            </Button>
            {batchMode && selectedStudents.size > 0 && (
              <Button onClick={handleBatchGenerate} disabled={batchGenerating}>
                {batchGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Download {selectedStudents.size} Report Cards
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or reg number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s: any) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}{s.is_current ? ' (Current)' : ''} - {s.academic_years?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle>Pupils</CardTitle>
            <CardDescription>{filteredStudents.length} pupils found</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStudents ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {batchMode && <th><Checkbox checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0} onCheckedChange={() => {
                        if (selectedStudents.size === filteredStudents.length) setSelectedStudents(new Set());
                        else setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
                      }} /></th>}
                      <th>Reg No</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr key={s.id}>
                        {batchMode && <td><Checkbox checked={selectedStudents.has(s.id)} onCheckedChange={() => {
                          const next = new Set(selectedStudents);
                          if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                          setSelectedStudents(next);
                        }} /></td>}
                        <td className="font-mono text-sm">{s.student_id}</td>
                        <td className="font-medium">{s.full_name}</td>
                        <td><Badge variant="secondary">{s.programs?.name}</Badge></td>
                        <td>
                          <Button size="sm" variant="outline" onClick={() => handleViewReportCard(s.id)}>
                            <FileText className="w-4 h-4 mr-1" /> View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Card Dialog */}
        <Dialog open={showReportCard} onOpenChange={setShowReportCard}>
          <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Card - {studentData?.full_name}</DialogTitle>
            </DialogHeader>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Conduct</Label>
                <Select value={conduct} onValueChange={setConduct}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Improvement'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Present</Label>
                  <Input type="number" value={attendance.present} onChange={(e) => setAttendance(a => ({ ...a, present: +e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Absent</Label>
                  <Input type="number" value={attendance.absent} onChange={(e) => setAttendance(a => ({ ...a, absent: +e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Total</Label>
                  <Input type="number" value={attendance.total} onChange={(e) => setAttendance(a => ({ ...a, total: +e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Class Teacher's Comment</Label>
                <Textarea value={teacherComment} onChange={(e) => setTeacherComment(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Headmistress's Comment</Label>
                <Textarea value={headComment} onChange={(e) => setHeadComment(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Printable Report Card - A4 Portrait */}
            <div ref={reportCardRef} className="bg-white text-black relative mx-auto" style={{ fontFamily: 'Georgia, serif', width: '794px', minHeight: '1123px' }}>
              {/* Outer decorative border (multi-band: red / gold / red) */}
              <div className="absolute inset-0 border-[8px] border-red-800 rounded-md" />
              <div className="absolute inset-[10px] border-[3px] border-amber-500 rounded-md" />
              <div className="absolute inset-[15px] border border-red-300 rounded-md" />
              <div className="absolute inset-[19px] border border-amber-400/60 rounded-md" />
              {/* Corner ornaments */}
              {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-10 h-10 border-[3px] border-amber-500 rounded-full opacity-40`} />
              ))}
              {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
                <div key={`d-${i}`} className={`absolute ${pos} w-3 h-3 m-3 bg-red-800 rounded-full`} />
              ))}

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0">
                <img src={reesLogo} alt="" className="w-[300px] h-[300px] object-contain" />
              </div>

              <div className="relative z-10 p-10">
                {/* Header */}
                <div className="text-center mb-5">
                  <img src={reesLogo} alt="Logo" className="w-20 h-20 mx-auto mb-2 object-contain" />
                  <h1 className="text-2xl font-bold text-red-800 tracking-wide uppercase">Rees Daycare Nursery & Primary School</h1>
                  <p className="text-xs text-gray-500 mt-1">Mbale City, Uganda | Tel: 0772379888/0706583860/0782063563 | Email: reesnursery@gmail.com</p>
                  <p className="text-xs italic text-amber-700 mt-1">"With God We Can"</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-red-800" />
                    <h2 className="text-lg font-bold tracking-[0.3em] text-gray-800">REPORT CARD</h2>
                    <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-red-800" />
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="bg-red-50/60 border border-red-200 rounded-lg p-3 mb-5">
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <p><span className="text-gray-500">Name:</span> <strong>{studentData?.full_name}</strong></p>
                    <p><span className="text-gray-500">Reg No:</span> <strong className="font-mono">{studentData?.student_id}</strong></p>
                    <p><span className="text-gray-500">Class:</span> <strong>{studentData?.programs.name}</strong></p>
                    <p><span className="text-gray-500">Term:</span> <strong>{selectedTerm || 'Term 1'}</strong></p>
                    <p><span className="text-gray-500">Academic Year:</span> <strong>{new Date().getFullYear()}</strong></p>
                  </div>
                </div>

                {/* Class Position */}
                {classPosition && (
                  <div className="grid grid-cols-3 gap-3 mb-5 text-center">
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                      <p className="text-xs text-amber-700 uppercase font-semibold">Class Position</p>
                      <p className="text-2xl font-bold text-amber-900">{classPosition.position} <span className="text-sm font-normal text-amber-700">/ {classPosition.total}</span></p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-700 uppercase font-semibold">Grand Total</p>
                      <p className="text-2xl font-bold text-red-900">
                        {classPosition.grandTotal} <span className="text-sm font-normal text-red-700">/ {studentResults.length * 100}</span>
                      </p>
                      <p className="text-[10px] text-red-700 mt-0.5">Average: {classPosition.average.toFixed(1)}%</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-700 uppercase font-semibold">Overall Rating</p>
                      <p className="text-2xl font-bold text-green-900">{getCompetencyFromScore(classPosition.average)}</p>
                    </div>
                  </div>
                )}

                {/* Awaiting marks banner — listed by subject */}
                {reportIncomplete && (
                  <div className="mb-5 p-3 rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-900 text-sm">
                    <div className="font-bold mb-1">⚠ Report card incomplete — awaiting marks for:</div>
                    <ul className="list-disc pl-6">
                      {missingSubjects.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-xs">
                      Printing and PDF download are disabled until all subjects are marked and approved.
                    </div>
                  </div>
                )}

                {/* All-term History (only when "All Terms" selected) */}
                {allTermResults.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-bold text-red-800 mb-2 uppercase tracking-wider">All Terms Performance History</h3>
                    {Object.entries(
                      allTermResults.reduce((acc: Record<string, ResultWithDetails[]>, r) => {
                        const k = r.student_courses.semesters?.name || 'Unknown';
                        (acc[k] ||= []).push(r);
                        return acc;
                      }, {})
                    )
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([term, rs]) => {
                        const avg = rs.reduce((s, r) => s + Number(r.total_marks || 0), 0) / rs.length;
                        return (
                          <div key={term} className="mb-3 border border-gray-200 rounded">
                            <div className="bg-gray-50 px-3 py-1.5 flex justify-between items-center text-xs">
                              <strong>{term}</strong>
                              <span>Avg: <strong className="text-red-800">{avg.toFixed(1)}%</strong> · {getCompetencyFromScore(avg)}</span>
                            </div>
                            <table className="w-full text-xs">
                              <tbody>
                                {rs.map(r => (
                                  <tr key={r.id} className="border-t border-gray-100">
                                    <td className="px-3 py-1">{r.student_courses.courses.name}</td>
                                    <td className="px-2 py-1 text-center w-16">{r.total_marks}</td>
                                    <td className="px-2 py-1 text-center w-16 font-semibold text-red-800">{getCompetencyFromScore(r.total_marks || 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Results Table */}
                {studentResults.length > 0 ? (
                  <table className="w-full border-collapse text-sm mb-5">
                    <thead>
                      <tr>
                        <th className="bg-red-800 text-white border border-red-900 px-3 py-2 text-left">Subject</th>
                        <th className="bg-red-800 text-white border border-red-900 px-2 py-2 text-center w-20">Total / 100</th>
                        <th className="bg-red-800 text-white border border-red-900 px-2 py-2 text-center w-14">Rating</th>
                        <th className="bg-red-800 text-white border border-red-900 px-2 py-2 text-center">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentResults.map((r, idx) => {
                        const hasMarks = r.total_marks !== null && r.total_marks !== undefined;
                        const competency = hasMarks ? getCompetencyFromScore(r.total_marks as number) : '';
                        return (
                          <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/40'}>
                            <td className="border border-gray-300 px-3 py-1.5">{r.student_courses.courses.name}</td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center font-bold">{hasMarks ? `${r.total_marks}/100` : '—'}</td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-red-800">{hasMarks ? competency : '—'}</td>
                            <td className="border border-gray-300 px-2 py-1.5 text-center text-xs italic text-gray-500">
                              {hasMarks ? COMPETENCY_RATINGS.find(c => c.code === competency)?.label : 'Awaiting marks'}
                            </td>
                          </tr>
                        );
                      })}
                      {studentResults.every(r => r.total_marks !== null && r.total_marks !== undefined) && (
                        <tr className="bg-amber-50 font-bold">
                          <td className="border border-gray-300 px-3 py-2 text-right">GRAND TOTAL</td>
                          <td className="border border-gray-300 px-2 py-2 text-center text-red-800">
                            {studentResults.reduce((s, r) => s + Number(r.total_marks || 0), 0)} / {studentResults.length * 100}
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center" colSpan={2}>
                            Average:{' '}
                            {(
                              studentResults.reduce((s, r) => s + Number(r.total_marks || 0), 0) /
                              studentResults.length
                            ).toFixed(1)}
                            %
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center text-gray-400 py-8 border border-dashed border-gray-300 rounded-lg mb-5">
                    <p>No results available for this term.</p>
                  </div>
                )}

                {/* Key */}
                <div className="text-xs mb-5 p-2 bg-amber-50 border border-amber-200 rounded flex flex-wrap gap-3">
                  <span className="font-bold text-amber-800">KEY:</span>
                  <span><strong>BE</strong> = Beyond Expectation (80-100)</span>
                  <span><strong>AE</strong> = Above Expectation (65-79)</span>
                  <span><strong>ME</strong> = Meeting Expectation (50-64)</span>
                  <span><strong>BW</strong> = Below Expectation (0-49)</span>
                </div>

                {/* Conduct & Attendance */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-5 border border-gray-200 rounded-lg p-3">
                  <div>
                    <p><strong>Conduct:</strong> <span className="text-red-800 font-semibold">{conduct}</span></p>
                    <p className="mt-2"><strong>Attendance:</strong> {attendance.present}/{attendance.total} days present, {attendance.absent} absent</p>
                  </div>
                  <div>
                    <p><strong>Co-curricular Activities:</strong></p>
                    <p className="text-xs text-gray-500 italic">Sports, Music, Art, Drama</p>
                  </div>
                </div>

                {/* Comments */}
                <div className="text-sm mb-6 space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-red-800">
                    <p className="font-bold text-xs text-gray-500 uppercase mb-1">Class Teacher's Comment</p>
                    <p className="italic">{teacherComment}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-amber-600">
                    <p className="font-bold text-xs text-gray-500 uppercase mb-1">Headmistress's Comment</p>
                    <p className="italic">{headComment}</p>
                  </div>
                </div>

                {/* Signatures & QR */}
                <div className="flex justify-between items-end mt-8 pt-4">
                  <div className="text-center">
                    <div className="w-40 border-t-2 border-black pt-2 text-xs font-medium">Class Teacher's Signature</div>
                  </div>
                  <div className="text-center">
                    <QRCodeSVG
                      value={`${window.location.origin}/verify?id=${studentData?.student_id}&term=${selectedTerm || 'term1'}&year=${new Date().getFullYear()}`}
                      size={56}
                    />
                    <p className="text-[8px] text-gray-400 mt-1">Scan to verify</p>
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-t-2 border-black pt-2 text-xs font-medium">Headmistress's Signature</div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-4 text-xs text-gray-400 border-t border-gray-200 pt-3">
                    <span>Next term begins: _________________</span>
                    <span>•</span>
                    <span>School stamp</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReportCard(false)}>Close</Button>
              <Button variant="outline" onClick={() => {
                if (!reportCardRef.current) return;
                const pw = window.open('', '_blank');
                if (!pw) return;
                pw.document.write(`
                  <html>
                    <head>
                      <title>Report Card</title>
                      <style>
                        @page { size: A4 portrait; margin: 0; }
                        html, body { margin: 0; padding: 0; background: #fff; }
                        body { font-family: Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
                        .report-wrap {
                          width: 210mm;
                          min-height: 297mm;
                          margin: 0 auto;
                          padding: 0;
                          box-sizing: border-box;
                          position: relative;
                          overflow: hidden;
                        }
                        .report-wrap > div { width: 100% !important; max-width: 100% !important; min-height: 297mm !important; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #999; padding: 6px; text-align: left; }
                        th { background: #b91c1c; color: white; }
                        img { max-width: 100%; }
                        @media print {
                          body { margin: 0; }
                          .report-wrap { width: 210mm; min-height: 297mm; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="report-wrap">${reportCardRef.current.innerHTML}</div>
                      <script>
                        window.onload = function() {
                          setTimeout(function(){ window.print(); }, 350);
                        };
                      </script>
                    </body>
                  </html>
                `);
                pw.document.close();
              }}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
