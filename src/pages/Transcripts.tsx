import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notifyDocumentGenerated } from '@/lib/notifications';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  FileText,
  Download,
  Search,
  Loader2,
  Award,
  GraduationCap,
  Printer,
  TrendingUp,
  History,
  Clock,
  Users,
  ImagePlus,
} from 'lucide-react';
import hfiLogo from '@/assets/hfi-logo.png';
import { QRCodeSVG } from 'qrcode.react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Student {
  id: string;
  student_id: string;
  user_id: string;
  current_year: number;
  enrollment_date: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  programs: {
    name: string;
    code: string;
    duration_years: number;
  };
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
    courses: {
      code: string;
      name: string;
      credit_units: number;
    };
    semesters: {
      name: string;
      semester_number: number;
      academic_years: {
        name: string;
      };
    };
  };
}

export default function Transcripts() {
  const { toast } = useToast();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentResults, setStudentResults] = useState<ResultWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [documentType, setDocumentType] = useState<'transcript' | 'certificate'>('transcript');
  const [documentLogs, setDocumentLogs] = useState<any[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [assigningPhotos, setAssigningPhotos] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  const batchTranscriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents();
    fetchDocumentLogs();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentResults();
    }
  }, [selectedStudent]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          user_id,
          current_year,
          enrollment_date,
          profiles!students_user_id_profiles_fkey(full_name, email, avatar_url),
          programs(name, code, duration_years)
        `)
        .order('student_id');

      if (error) throw error;
      setStudents(data as unknown as Student[]);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('document_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setDocumentLogs(data || []);
    } catch (err) {
      console.error('Error fetching document logs:', err);
    }
  };

  const logDocumentGeneration = async (type: 'transcript' | 'certificate') => {
    const studentData = getSelectedStudentData();
    if (!studentData) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('document_logs').insert({
        student_id: studentData.id,
        document_type: type,
        generated_by: user.id,
        student_name: studentData.profiles.full_name,
        student_number: studentData.student_id,
        program_name: studentData.programs.name,
      });
      fetchDocumentLogs();
    } catch (err) {
      console.error('Failed to log document generation:', err);
    }
  };

  const fetchStudentResults = async () => {
    if (!selectedStudent) return;

    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          coursework_marks,
          exam_marks,
          total_marks,
          grade,
          grade_point,
          status,
          student_courses(
            courses(code, name, credit_units),
            semesters(
              name,
              semester_number,
              academic_years(name)
            )
          )
        `)
        .eq('status', 'approved')
        .in('student_course_id', 
          (await supabase
            .from('student_courses')
            .select('id')
            .eq('student_id', selectedStudent)
          ).data?.map(sc => sc.id) || []
        );

      if (error) throw error;
      setStudentResults(data as unknown as ResultWithDetails[]);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const getSelectedStudentData = () => {
    return students.find(s => s.id === selectedStudent);
  };

  const calculateCGPA = () => {
    if (studentResults.length === 0) return 0;
    
    let totalGradePoints = 0;
    let totalCreditUnits = 0;

    studentResults.forEach(result => {
      const creditUnits = result.student_courses.courses.credit_units;
      totalGradePoints += (result.grade_point || 0) * creditUnits;
      totalCreditUnits += creditUnits;
    });

    return totalCreditUnits > 0 ? (totalGradePoints / totalCreditUnits).toFixed(2) : '0.00';
  };

  const getClassification = (cgpa: number) => {
    if (cgpa >= 4.5) return 'First Class Honours';
    if (cgpa >= 3.5) return 'Second Class Honours (Upper Division)';
    if (cgpa >= 2.5) return 'Second Class Honours (Lower Division)';
    if (cgpa >= 2.0) return 'Pass';
    return 'Fail';
  };

  const getAcademicYears = () => {
    const years = new Set<string>();
    studentResults.forEach(r => years.add(r.student_courses.semesters.academic_years.name));
    return Array.from(years).sort();
  };

  const filteredResults = selectedYear === 'all' 
    ? studentResults 
    : studentResults.filter(r => r.student_courses.semesters.academic_years.name === selectedYear);

  const getResultsBySemester = () => {
    const grouped: Record<string, { semesterName: string; semesterNumber: number; academicYear: string; results: ResultWithDetails[]; semesterGPA: string }> = {};
    filteredResults.forEach(result => {
      const semName = result.student_courses.semesters.name;
      const semNum = result.student_courses.semesters.semester_number;
      const ayName = result.student_courses.semesters.academic_years.name;
      if (!grouped[semName]) {
        grouped[semName] = { semesterName: semName, semesterNumber: semNum, academicYear: ayName, results: [], semesterGPA: '0.00' };
      }
      grouped[semName].results.push(result);
    });
    // Calculate per-semester GPA
    Object.values(grouped).forEach(g => {
      let totalGP = 0, totalCU = 0;
      g.results.forEach(r => {
        const cu = r.student_courses.courses.credit_units;
        totalGP += (r.grade_point || 0) * cu;
        totalCU += cu;
      });
      g.semesterGPA = totalCU > 0 ? (totalGP / totalCU).toFixed(2) : '0.00';
    });
    return Object.values(grouped).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      return a.semesterNumber - b.semesterNumber;
    });
  };

  const handleExportPDF = async (type: 'transcript' | 'certificate') => {
    const contentRef = type === 'transcript' ? transcriptRef.current : certificateRef.current;
    if (!contentRef) return;

    try {
      toast({ title: 'Generating PDF...', description: 'Please wait while we create your document.' });

      const canvas = await html2canvas(contentRef, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Handle multi-page if content is tall
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
      const fileName = `${type}_${studentData?.student_id || 'unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({ title: 'PDF Downloaded', description: `${type === 'transcript' ? 'Transcript' : 'Certificate'} saved as ${fileName}` });
      await logDocumentGeneration(type);

      // Send notification
      if (studentData) {
        try {
          const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
          if (adminRoles?.length) {
            await notifyDocumentGenerated(adminRoles.map(r => r.user_id), studentData.profiles.full_name, type);
          }
        } catch (err) { console.error('Failed to send notification:', err); }
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }
  };

  const handlePrint = async (type: 'transcript' | 'certificate') => {
    const printContent = type === 'transcript' ? transcriptRef.current : certificateRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${type === 'transcript' ? 'Academic Transcript' : 'Certificate'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&display=swap');
            body { font-family: 'Lora', 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: bold; color: #1a365d; letter-spacing: 3px; }
            .logo-img { width: 80px; height: 80px; margin: 0 auto 10px; }
            .subtitle { font-size: 14px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
            .title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #1a365d; letter-spacing: 2px; }
            .student-info { margin-bottom: 30px; }
            .info-row { display: flex; margin-bottom: 8px; }
            .info-label { width: 150px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background: #1a365d; color: white; }
            .footer { margin-top: 40px; text-align: center; }
            .signature { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature-line { width: 200px; border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 13px; }
            .cert-wrapper { position: relative; border: 8px double #b8860b; padding: 60px 40px; background: linear-gradient(135deg, #fffef5 0%, #fff 50%, #fffef5 100%); overflow: hidden; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    await logDocumentGeneration(type);

    const studentData = getSelectedStudentData();
    if (studentData) {
      try {
        const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
        if (adminRoles?.length) {
          await notifyDocumentGenerated(adminRoles.map(r => r.user_id), studentData.profiles.full_name, type);
        }
      } catch (err) { console.error('Failed to send notification:', err); }
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBatchGenerateTranscripts = async () => {
    if (selectedStudents.size === 0) return;
    setBatchGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      const { data: { user } } = await supabase.auth.getUser();

      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        // Fetch results for this student
        const { data: scData } = await supabase
          .from('student_courses')
          .select('id')
          .eq('student_id', studentId);

        if (!scData?.length) continue;

        const { data: resultsData } = await supabase
          .from('results')
          .select(`
            id, coursework_marks, exam_marks, total_marks, grade, grade_point, status,
            student_courses(
              courses(code, name, credit_units),
              semesters(name, semester_number, academic_years(name))
            )
          `)
          .eq('status', 'approved')
          .in('student_course_id', scData.map(sc => sc.id));

        const results = (resultsData || []) as unknown as ResultWithDetails[];

        // Calculate CGPA
        let totalGP = 0, totalCU = 0;
        results.forEach(r => {
          const cu = r.student_courses.courses.credit_units;
          totalGP += (r.grade_point || 0) * cu;
          totalCU += cu;
        });
        const studentCGPA = totalCU > 0 ? (totalGP / totalCU).toFixed(2) : '0.00';

        // Group by semester
        const grouped: Record<string, { semesterName: string; results: ResultWithDetails[]; semesterGPA: string }> = {};
        results.forEach(r => {
          const semName = r.student_courses.semesters.name;
          if (!grouped[semName]) grouped[semName] = { semesterName: semName, results: [], semesterGPA: '0.00' };
          grouped[semName].results.push(r);
        });
        Object.values(grouped).forEach(g => {
          let gp = 0, cu = 0;
          g.results.forEach(r => { const c = r.student_courses.courses.credit_units; gp += (r.grade_point || 0) * c; cu += c; });
          g.semesterGPA = cu > 0 ? (gp / cu).toFixed(2) : '0.00';
        });

        // Build transcript page using jsPDF directly
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;

        let y = 20;
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('SALEM UGANDA', 105, y, { align: 'center' });
        y += 7;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Institution of Higher Learning', 105, y, { align: 'center' });
        y += 7;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OFFICIAL ACADEMIC TRANSCRIPT', 105, y, { align: 'center' });
        y += 10;

        pdf.setDrawColor(26, 54, 93);
        pdf.line(20, y, 190, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Student Name: ${student.profiles.full_name}`, 20, y);
        pdf.text(`Student ID: ${student.student_id}`, 120, y);
        y += 6;
        pdf.text(`Program: ${student.programs.name}`, 20, y);
        pdf.text(`Enrollment: ${new Date(student.enrollment_date).toLocaleDateString()}`, 120, y);
        y += 10;

        for (const sem of Object.values(grouped)) {
          if (y > 260) { pdf.addPage(); y = 20; }
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sem.semesterName, 20, y);
          y += 6;

          // Table header
          pdf.setFontSize(8);
          pdf.setFillColor(26, 54, 93);
          pdf.setTextColor(255, 255, 255);
          pdf.rect(20, y, 170, 6, 'F');
          pdf.text('Code', 22, y + 4);
          pdf.text('Course Name', 45, y + 4);
          pdf.text('CU', 120, y + 4);
          pdf.text('Marks', 135, y + 4);
          pdf.text('Grade', 155, y + 4);
          pdf.text('GP', 175, y + 4);
          y += 6;
          pdf.setTextColor(0, 0, 0);

          for (const r of sem.results) {
            if (y > 275) { pdf.addPage(); y = 20; }
            pdf.setFont('helvetica', 'normal');
            pdf.text(r.student_courses.courses.code, 22, y + 4);
            pdf.text(r.student_courses.courses.name.substring(0, 40), 45, y + 4);
            pdf.text(String(r.student_courses.courses.credit_units), 122, y + 4);
            pdf.text(String(r.total_marks || 0), 137, y + 4);
            pdf.text(r.grade || '-', 157, y + 4);
            pdf.text(String(r.grade_point || 0), 177, y + 4);
            pdf.line(20, y + 6, 190, y + 6);
            y += 6;
          }
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Semester GPA: ${sem.semesterGPA}`, 140, y + 5);
          y += 10;
        }

        if (y > 260) { pdf.addPage(); y = 20; }
        y += 5;
        pdf.setFontSize(11);
        pdf.text(`Cumulative GPA: ${studentCGPA}`, 20, y);
        y += 6;
        pdf.text(`Classification: ${getClassification(parseFloat(studentCGPA))}`, 20, y);

        // Log generation
        if (user) {
          await supabase.from('document_logs').insert({
            student_id: student.id,
            document_type: 'transcript',
            generated_by: user.id,
            student_name: student.profiles.full_name,
            student_number: student.student_id,
            program_name: student.programs.name,
          });
        }
      }

      pdf.save(`batch_transcripts_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: 'Batch PDF Generated', description: `${selectedStudents.size} transcripts downloaded.` });
      fetchDocumentLogs();
      setSelectedStudents(new Set());
      setBatchMode(false);
    } catch (error) {
      console.error('Batch generation error:', error);
      toast({ title: 'Error', description: 'Failed to generate batch transcripts', variant: 'destructive' });
    } finally {
      setBatchGenerating(false);
    }
  };

  const SAMPLE_PHOTOS = [
    '/sample-photos/male-student-1.jpg',
    '/sample-photos/female-student-1.jpg',
    '/sample-photos/male-student-2.jpg',
    '/sample-photos/female-student-2.jpg',
  ];

  const handleAssignSamplePhotos = async () => {
    setAssigningPhotos(true);
    try {
      const studentsWithoutPhotos = students.filter(s => !s.profiles.avatar_url);
      if (studentsWithoutPhotos.length === 0) {
        toast({ title: 'All Set', description: 'All students already have photos assigned.' });
        return;
      }

      for (let i = 0; i < studentsWithoutPhotos.length; i++) {
        const student = studentsWithoutPhotos[i];
        const photoUrl = window.location.origin + SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length];

        // Fetch the sample image
        const response = await fetch(SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length]);
        const blob = await response.blob();
        const filePath = `${student.id}/passport.jpg`;

        await supabase.storage.from('student-photos').upload(filePath, blob, { upsert: true });
        const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(filePath);

        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', student.user_id);
      }

      toast({ title: 'Photos Assigned', description: `Sample photos assigned to ${studentsWithoutPhotos.length} students.` });
      fetchStudents();
    } catch (error) {
      console.error('Error assigning photos:', error);
      toast({ title: 'Error', description: 'Failed to assign sample photos', variant: 'destructive' });
    } finally {
      setAssigningPhotos(false);
    }
  };

  const getGPAProgressionData = () => {
    const allSemesters = getResultsBySemesterAll();
    let cumulativeGP = 0;
    let cumulativeCU = 0;
    return allSemesters.map(sem => {
      sem.results.forEach(r => {
        const cu = r.student_courses.courses.credit_units;
        cumulativeGP += (r.grade_point || 0) * cu;
        cumulativeCU += cu;
      });
      const cGPA = cumulativeCU > 0 ? parseFloat((cumulativeGP / cumulativeCU).toFixed(2)) : 0;
      return {
        semester: sem.semesterName,
        semesterGPA: parseFloat(sem.semesterGPA),
        cumulativeGPA: cGPA,
      };
    });
  };

  const getResultsBySemesterAll = () => {
    // Same as getResultsBySemester but always uses all results (ignores year filter)
    const grouped: Record<string, { semesterName: string; semesterNumber: number; academicYear: string; results: ResultWithDetails[]; semesterGPA: string }> = {};
    studentResults.forEach(result => {
      const semName = result.student_courses.semesters.name;
      const semNum = result.student_courses.semesters.semester_number;
      const ayName = result.student_courses.semesters.academic_years.name;
      if (!grouped[semName]) {
        grouped[semName] = { semesterName: semName, semesterNumber: semNum, academicYear: ayName, results: [], semesterGPA: '0.00' };
      }
      grouped[semName].results.push(result);
    });
    Object.values(grouped).forEach(g => {
      let totalGP = 0, totalCU = 0;
      g.results.forEach(r => {
        const cu = r.student_courses.courses.credit_units;
        totalGP += (r.grade_point || 0) * cu;
        totalCU += cu;
      });
      g.semesterGPA = totalCU > 0 ? (totalGP / totalCU).toFixed(2) : '0.00';
    });
    return Object.values(grouped).sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear.localeCompare(b.academicYear);
      return a.semesterNumber - b.semesterNumber;
    });
  };

  const filteredStudents = students.filter(student =>
    student.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudentData = getSelectedStudentData();
  const cgpa = parseFloat(calculateCGPA() as string);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transcripts & Certificates</h1>
            <p className="text-muted-foreground">Generate academic transcripts and certificates for students</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {role === 'admin' && (
              <>
                <Button variant="outline" size="sm" onClick={handleAssignSamplePhotos} disabled={assigningPhotos}>
                  {assigningPhotos ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                  Assign Sample Photos
                </Button>
                <Button
                  variant={batchMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setBatchMode(!batchMode); setSelectedStudents(new Set()); }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {batchMode ? 'Exit Batch Mode' : 'Batch Transcripts'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Batch Mode Controls */}
        {batchMode && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedStudents.size} of {filteredStudents.length} students selected
                  </span>
                </div>
                <Button
                  onClick={handleBatchGenerateTranscripts}
                  disabled={selectedStudents.size === 0 || batchGenerating}
                >
                  {batchGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download {selectedStudents.size} Transcript{selectedStudents.size !== 1 ? 's' : ''} as PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Select */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {!batchMode && (
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.profiles.full_name} ({student.student_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Batch student list with checkboxes */}
            {batchMode && (
              <div className="mt-4 max-h-80 overflow-y-auto space-y-1">
                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleStudentSelection(student.id)}
                  >
                    <Checkbox checked={selectedStudents.has(student.id)} />
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                      {student.profiles.avatar_url ? (
                        <img src={student.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{student.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.student_id} • {student.programs.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Year Filter */}
        {selectedStudent && getAcademicYears().length > 0 && (
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">Academic Year:</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {getAcademicYears().map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedStudent && selectedStudentData && (
          <>
            {/* Student Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedStudentData.profiles.full_name}</CardTitle>
                    <CardDescription>{selectedStudentData.student_id}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setDocumentType('transcript');
                        setShowTranscript(true);
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Transcript
                    </Button>
                    <Button 
                      onClick={() => {
                        setDocumentType('certificate');
                        setShowCertificate(true);
                      }}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Certificate
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Program</p>
                    <p className="font-medium">{selectedStudentData.programs.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Year</p>
                    <p className="font-medium">Year {selectedStudentData.current_year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Enrollment Date</p>
                    <p className="font-medium">{new Date(selectedStudentData.enrollment_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Academic Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{studentResults.length}</p>
                      <p className="text-sm text-muted-foreground">Courses Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{cgpa}</p>
                      <p className="text-sm text-muted-foreground">CGPA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{getClassification(cgpa)}</p>
                      <p className="text-sm text-muted-foreground">Classification</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* GPA Progression Chart */}
            {studentResults.length > 0 && getGPAProgressionData().length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    GPA Progression
                  </CardTitle>
                  <CardDescription>Semester GPA vs Cumulative GPA across semesters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getGPAProgressionData()}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="semester" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                          }}
                        />
                        <Line type="monotone" dataKey="semesterGPA" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Semester GPA" />
                        <Line type="monotone" dataKey="cumulativeGPA" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" name="Cumulative GPA" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-primary" />
                      <span className="text-muted-foreground">Semester GPA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-destructive border-dashed" style={{ borderTop: '2px dashed hsl(var(--destructive))' }} />
                      <span className="text-muted-foreground">Cumulative GPA</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {getResultsBySemester().map((semGroup) => (
              <Card key={semGroup.semesterName}>
                <CardHeader>
                  <CardTitle className="text-lg">{semGroup.semesterName}</CardTitle>
                  <CardDescription>
                    {semGroup.results.length} course{semGroup.results.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Name</th>
                          <th>CU</th>
                          <th>Marks</th>
                          <th>Grade</th>
                          <th>GP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semGroup.results.map(result => (
                          <tr key={result.id}>
                            <td className="font-mono">{result.student_courses.courses.code}</td>
                            <td>{result.student_courses.courses.name}</td>
                            <td>{result.student_courses.courses.credit_units}</td>
                            <td>{result.total_marks}</td>
                            <td>
                              <Badge variant={result.grade === 'F' ? 'destructive' : 'default'}>
                                {result.grade}
                              </Badge>
                            </td>
                            <td>{result.grade_point}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <div className="bg-muted px-4 py-2 rounded-lg">
                      <span className="text-sm text-muted-foreground mr-2">Semester GPA:</span>
                      <span className="font-bold text-foreground">{semGroup.semesterGPA}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {studentResults.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    No approved results found
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Transcript Modal */}
        <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Academic Transcript</DialogTitle>
              <DialogDescription>
                Official academic transcript for {selectedStudentData?.profiles.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" onClick={() => handleExportPDF('transcript')}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={() => handlePrint('transcript')}>
                <Printer className="w-4 h-4 mr-2" />
                Print Transcript
              </Button>
            </div>
            <div ref={transcriptRef} className="p-6 bg-white text-black">
              <div className="header">
                <img src={salemLogo} alt="Salem Uganda" className="logo-img" style={{ width: '80px', height: '80px', margin: '0 auto 10px', display: 'block' }} />
                <div className="logo">SALEM UGANDA</div>
                <div className="subtitle">Institution of Higher Learning</div>
                <div className="title">Official Academic Transcript</div>
              </div>
              
              <div className="student-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="info-row">
                    <span className="info-label">Student Name:</span>
                    <span>{selectedStudentData?.profiles.full_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Student ID:</span>
                    <span>{selectedStudentData?.student_id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Program:</span>
                    <span>{selectedStudentData?.programs.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Enrollment Date:</span>
                    <span>{selectedStudentData && new Date(selectedStudentData.enrollment_date).toLocaleDateString()}</span>
                  </div>
                </div>
                {selectedStudentData?.profiles.avatar_url && (
                  <div style={{ width: '100px', height: '120px', border: '1px solid #ccc', overflow: 'hidden', flexShrink: 0, marginLeft: '20px' }}>
                    <img 
                      src={selectedStudentData.profiles.avatar_url} 
                      alt="Passport Photo" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
              </div>

              {getResultsBySemester().map((semGroup) => (
                <div key={semGroup.semesterName} style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', color: '#1a365d', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
                    {semGroup.semesterName}
                  </h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Course Name</th>
                        <th>CU</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th>GP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semGroup.results.map(result => (
                        <tr key={result.id}>
                          <td>{result.student_courses.courses.code}</td>
                          <td>{result.student_courses.courses.name}</td>
                          <td>{result.student_courses.courses.credit_units}</td>
                          <td>{result.total_marks}</td>
                          <td>{result.grade}</td>
                          <td>{result.grade_point}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'right', marginTop: '5px', fontSize: '13px' }}>
                    <strong>Semester GPA: {semGroup.semesterGPA}</strong>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '30px' }}>
                <strong>Cumulative GPA: {cgpa}</strong>
                <br />
                <strong>Classification: {getClassification(cgpa)}</strong>
              </div>

              <div className="signature">
                <div className="signature-line">Registrar</div>
                <div className="signature-line">Date</div>
                <div className="signature-line">Official Stamp</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Certificate Modal */}
        <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Certificate of Completion</DialogTitle>
              <DialogDescription>
                Certificate for {selectedStudentData?.profiles.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" onClick={() => handleExportPDF('certificate')}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={() => handlePrint('certificate')}>
                <Printer className="w-4 h-4 mr-2" />
                Print Certificate
              </Button>
            </div>
            <div ref={certificateRef} className="bg-white text-black">
              <div className="cert-wrapper" style={{ position: 'relative', border: '8px double #b8860b', padding: '60px 40px', background: 'linear-gradient(135deg, #fffef5 0%, #fff 50%, #fffef5 100%)', overflow: 'hidden' }}>
                {/* Inner border */}
                <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', bottom: '15px', border: '2px solid #b8860b', pointerEvents: 'none' }} />
                {/* Watermark */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontFamily: 'Playfair Display, serif', fontSize: '100px', color: 'rgba(26, 54, 93, 0.04)', fontWeight: 'bold', letterSpacing: '10px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
                  SALEM UGANDA
                </div>
                {/* Content */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ textAlign: 'center' }}>
                    <img src={salemLogo} alt="Salem Uganda" style={{ width: '100px', height: '100px', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 'bold', color: '#1a365d', letterSpacing: '3px' }}>SALEM UGANDA</div>
                    <div style={{ fontSize: '14px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase' as const }}>Institution of Higher Learning</div>
                    <div style={{ textAlign: 'center', color: '#b8860b', fontSize: '24px', margin: '10px 0', letterSpacing: '8px' }}>✦ ✦ ✦</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 'bold', marginTop: '20px', textTransform: 'uppercase' as const, color: '#1a365d', letterSpacing: '2px' }}>Certificate of Completion</div>
                  </div>
                  
                  <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                    <p style={{ fontSize: '16px' }}>This is to certify that</p>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '36px', fontWeight: 'bold', margin: '15px auto', color: '#1a365d', borderBottom: '2px solid #b8860b', display: 'inline-block', paddingBottom: '5px' }}>
                      {selectedStudentData?.profiles.full_name}
                    </div>
                    <p style={{ fontSize: '16px' }}>Student ID: {selectedStudentData?.student_id}</p>
                    <p style={{ fontSize: '16px', marginTop: '20px' }}>has successfully completed the requirements for the</p>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', margin: '15px 0', color: '#333', fontWeight: 'bold' }}>
                      {selectedStudentData?.programs.name}
                    </div>
                    <p style={{ fontSize: '16px' }}>
                      Duration: {selectedStudentData?.programs.duration_years} Year{(selectedStudentData?.programs.duration_years || 0) > 1 ? 's' : ''}
                      {' • '}
                      Total Credit Units: {studentResults.reduce((sum, r) => sum + r.student_courses.courses.credit_units, 0)}
                    </p>
                    <p style={{ fontSize: '16px', marginTop: '10px' }}>
                      with a Cumulative Grade Point Average of <strong>{cgpa}</strong>
                    </p>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#b8860b', fontWeight: 'bold', marginTop: '10px' }}>
                      {getClassification(cgpa)}
                    </div>

                    {/* Seal */}
                    <div style={{ width: '80px', height: '80px', margin: '25px auto', border: '3px solid #b8860b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', textAlign: 'center', color: '#b8860b', fontWeight: 'bold', textTransform: 'uppercase' as const }}>
                      Official<br/>Seal
                    </div>
                    <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                      Awarded on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  <div className="signature" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Principal</div>
                    <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Academic Registrar</div>
                    <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Official Stamp</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Generation History */}
        {role === 'admin' && documentLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Document Generation History
              </CardTitle>
              <CardDescription>Recent transcript and certificate generations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Document Type</th>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Program</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <Badge variant={log.document_type === 'transcript' ? 'default' : 'secondary'}>
                            {log.document_type === 'transcript' ? '📄 Transcript' : '🎓 Certificate'}
                          </Badge>
                        </td>
                        <td className="font-medium">{log.student_name}</td>
                        <td className="font-mono text-sm">{log.student_number}</td>
                        <td className="text-sm text-muted-foreground">{log.program_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
