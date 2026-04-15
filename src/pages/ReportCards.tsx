import React, { useState, useEffect, useRef } from 'react';
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
  user_id: string;
  current_year: number;
  enrollment_date: string;
  profiles: { full_name: string; email: string; avatar_url: string | null };
  programs: { name: string; code: string; duration_years: number };
}

interface ResultWithDetails {
  id: string;
  coursework_marks: number;
  exam_marks: number;
  total_marks: number;
  grade: string;
  grade_point: number;
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
  const [batchMode, setBatchMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [teacherComment, setTeacherComment] = useState('Good performance. Keep it up!');
  const [headComment, setHeadComment] = useState('Well done. Continue working hard.');
  const [conduct, setConduct] = useState('Good');
  const [attendance, setAttendance] = useState({ present: 60, absent: 5, total: 65 });
  const reportCardRef = useRef<HTMLDivElement>(null);

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['all-students-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`id, student_id, user_id, current_year, enrollment_date,
          profiles!students_user_id_profiles_fkey(full_name, email, avatar_url),
          programs(name, code, duration_years)`)
        .order('student_id');
      if (error) throw error;
      return data as unknown as Student[];
    },
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ['semesters-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, semester_number, academic_year_id, academic_years:academic_year_id(name)')
        .order('semester_number');
      if (error) throw error;
      return data;
    },
  });

  const fetchStudentResults = async (studentId: string) => {
    const { data: scData } = await supabase.from('student_courses').select('id').eq('student_id', studentId);
    if (!scData?.length) return [];
    
    let query = supabase.from('results')
      .select(`id, coursework_marks, exam_marks, total_marks, grade, grade_point, status,
        student_courses(courses(code, name, credit_units), semesters(name, semester_number, academic_years(name)))`)
      .eq('status', 'approved')
      .in('student_course_id', scData.map(sc => sc.id));

    const { data } = await query;
    return (data || []) as unknown as ResultWithDetails[];
  };

  const handleViewReportCard = async (studentId: string) => {
    setSelectedStudent(studentId);
    const results = await fetchStudentResults(studentId);
    // Filter by selected term if set
    const filtered = selectedTerm 
      ? results.filter(r => r.student_courses.semesters.name === selectedTerm)
      : results;
    setStudentResults(filtered);
    setShowReportCard(true);
  };

  const getSelectedStudentData = () => students.find(s => s.id === selectedStudent);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleExportPDF = async () => {
    if (!reportCardRef.current) return;
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
      pdf.save(`report_card_${studentData?.student_id || 'unknown'}_${selectedTerm || 'all'}.pdf`);
      toast({ title: 'PDF Downloaded', description: 'Report card saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const handleBatchGenerate = async () => {
    if (selectedStudents.size === 0) return;
    setBatchGenerating(true);
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
        pdf.text('Mbale City, Uganda | +256780306692', pw / 2, y, { align: 'center' });
        y += 5;
        pdf.text('"Building Bright Futures"', pw / 2, y, { align: 'center' });
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
        pdf.text(`Name: ${student.profiles.full_name}`, 15, y);
        pdf.text(`Reg No: ${student.student_id}`, pw / 2, y);
        y += 6;
        pdf.text(`Class: ${student.programs.name}`, 15, y);
        pdf.text(`Term: ${selectedTerm || 'All Terms'}`, pw / 2, y);
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
        pdf.text("Head Teacher's Comment:", 15, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text(headComment, 15, y);

        // Key
        y += 12;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key: BE = Beyond Expectation | AE = Above Expectation | ME = Meeting Expectation | BW = Below Expectation', 15, y);
      }

      pdf.save(`batch_report_cards_${selectedTerm || 'all'}.pdf`);
      toast({ title: 'Batch PDF Downloaded', description: `${selectedStudents.size} report cards generated.` });
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
                  <SelectItem value="all">All Terms</SelectItem>
                  {semesters.map((s: any) => (
                    <SelectItem key={s.id} value={s.name}>{s.name} - {s.academic_years?.name}</SelectItem>
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
                        <td className="font-medium">{s.profiles?.full_name}</td>
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Card - {studentData?.profiles.full_name}</DialogTitle>
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
                <Label>Head Teacher's Comment</Label>
                <Textarea value={headComment} onChange={(e) => setHeadComment(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Printable Report Card */}
            <div ref={reportCardRef} className="bg-white text-black p-8" style={{ fontFamily: 'serif' }}>
              {/* Header */}
              <div className="text-center border-b-2 border-red-800 pb-4 mb-4">
                <img src={reesLogo} alt="Logo" className="w-16 h-16 mx-auto mb-2 object-contain" />
                <h1 className="text-xl font-bold text-red-800 tracking-wide">REES DAYCARE NURSERY & PRIMARY SCHOOL</h1>
                <p className="text-xs text-gray-600">Mbale City, Uganda | Tel: +256780306692</p>
                <p className="text-xs italic text-gray-500 mt-1">"Building Bright Futures"</p>
                <h2 className="text-lg font-bold mt-3 tracking-widest">REPORT CARD</h2>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <p><strong>Name:</strong> {studentData?.profiles.full_name}</p>
                <p><strong>Reg No:</strong> {studentData?.student_id}</p>
                <p><strong>Class:</strong> {studentData?.programs.name}</p>
                <p><strong>Term:</strong> {selectedTerm || 'All Terms'}</p>
                <p><strong>Year:</strong> {new Date().getFullYear()}</p>
              </div>

              {/* Results Table */}
              {studentResults.length > 0 ? (
                <table className="w-full border-collapse border border-gray-400 text-sm mb-4">
                  <thead>
                    <tr className="bg-red-800 text-white">
                      <th className="border border-gray-400 px-2 py-1 text-left">Subject</th>
                      <th className="border border-gray-400 px-2 py-1 text-center">CW</th>
                      <th className="border border-gray-400 px-2 py-1 text-center">Exam</th>
                      <th className="border border-gray-400 px-2 py-1 text-center">Total</th>
                      <th className="border border-gray-400 px-2 py-1 text-center">Rating</th>
                      <th className="border border-gray-400 px-2 py-1 text-center">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map((r) => {
                      const competency = getCompetencyFromScore(r.total_marks || 0);
                      return (
                        <tr key={r.id}>
                          <td className="border border-gray-400 px-2 py-1">{r.student_courses.courses.name}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{r.coursework_marks}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{r.exam_marks}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center font-bold">{r.total_marks}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center font-bold">{competency}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center text-xs">
                            {COMPETENCY_RATINGS.find(c => c.code === competency)?.label}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-4">No results available for this term.</p>
              )}

              {/* Key */}
              <div className="text-xs mb-4 p-2 bg-gray-50 border rounded">
                <strong>Key:</strong> BE = Beyond Expectation (80-100) | AE = Above Expectation (65-79) | ME = Meeting Expectation (50-64) | BW = Below Expectation (0-49)
              </div>

              {/* Conduct & Attendance */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p><strong>Conduct:</strong> {conduct}</p>
                  <p className="mt-2"><strong>Attendance:</strong> {attendance.present}/{attendance.total} days present, {attendance.absent} days absent</p>
                </div>
                <div>
                  <p><strong>Co-curricular Activities:</strong></p>
                  <p className="text-xs text-gray-500 italic">Sports, Music, Art, Drama</p>
                </div>
              </div>

              {/* Comments */}
              <div className="text-sm mb-6 space-y-3">
                <div>
                  <p><strong>Class Teacher's Comment:</strong></p>
                  <p className="border-b border-dotted border-gray-400 pb-1 italic">{teacherComment}</p>
                </div>
                <div>
                  <p><strong>Head Teacher's Comment:</strong></p>
                  <p className="border-b border-dotted border-gray-400 pb-1 italic">{headComment}</p>
                </div>
              </div>

              {/* Signatures & QR */}
              <div className="flex justify-between items-end mt-8">
                <div className="text-center">
                  <div className="w-40 border-t border-black pt-1 text-xs">Class Teacher's Signature</div>
                </div>
                <QRCodeSVG
                  value={`https://rees.ac.ug/verify?id=${studentData?.student_id}&term=${selectedTerm || 'all'}&year=${new Date().getFullYear()}`}
                  size={60}
                />
                <div className="text-center">
                  <div className="w-40 border-t border-black pt-1 text-xs">Head Teacher's Signature</div>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Next term begins: _________________ | School stamp: _________________
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReportCard(false)}>Close</Button>
              <Button variant="outline" onClick={() => {
                if (!reportCardRef.current) return;
                const pw = window.open('', '_blank');
                if (!pw) return;
                pw.document.write(`<html><head><title>Report Card</title><style>body{font-family:serif;padding:20px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:6px;text-align:left}th{background:#b91c1c;color:white}@media print{body{padding:0}}</style></head><body>${reportCardRef.current.innerHTML}</body></html>`);
                pw.document.close();
                pw.print();
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
