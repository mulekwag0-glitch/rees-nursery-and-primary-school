import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notifyDocumentGenerated } from '@/lib/notifications';
import {
  FileText,
  Download,
  Search,
  Loader2,
  Award,
  GraduationCap,
  Printer,
} from 'lucide-react';
import salemLogo from '@/assets/salem-logo.png';
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
  current_year: number;
  enrollment_date: string;
  profiles: {
    full_name: string;
    email: string;
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [documentType, setDocumentType] = useState<'transcript' | 'certificate'>('transcript');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStudents();
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
          current_year,
          enrollment_date,
          profiles!students_user_id_profiles_fkey(full_name, email),
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
            body { 
              font-family: 'Lora', 'Times New Roman', serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #1a365d; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
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
            
            /* Certificate specific styles */
            .cert-wrapper {
              position: relative;
              border: 8px double #b8860b;
              padding: 60px 40px;
              background: linear-gradient(135deg, #fffef5 0%, #fff 50%, #fffef5 100%);
              overflow: hidden;
            }
            .cert-wrapper::before {
              content: '';
              position: absolute;
              top: 15px; left: 15px; right: 15px; bottom: 15px;
              border: 2px solid #b8860b;
              pointer-events: none;
            }
            .cert-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-family: 'Playfair Display', serif;
              font-size: 100px;
              color: rgba(26, 54, 93, 0.04);
              font-weight: bold;
              letter-spacing: 10px;
              white-space: nowrap;
              pointer-events: none;
              z-index: 0;
            }
            .cert-content { position: relative; z-index: 1; }
            .cert-header { text-align: center; border-bottom: none; margin-bottom: 10px; }
            .cert-ornament { text-align: center; color: #b8860b; font-size: 24px; margin: 10px 0; letter-spacing: 8px; }
            .certificate-body { text-align: center; padding: 30px 20px; }
            .certificate-name { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: bold; margin: 15px 0; color: #1a365d; border-bottom: 2px solid #b8860b; display: inline-block; padding-bottom: 5px; }
            .certificate-program { font-family: 'Playfair Display', serif; font-size: 22px; margin: 10px 0; color: #333; font-style: italic; }
            .cert-classification { font-family: 'Playfair Display', serif; font-size: 20px; color: #b8860b; font-weight: bold; margin-top: 10px; }
            .cert-date { font-size: 14px; margin-top: 25px; color: #666; font-style: italic; }
            .cert-seal { width: 80px; height: 80px; margin: 20px auto; border: 3px solid #b8860b; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; color: #b8860b; font-weight: bold; text-transform: uppercase; }

            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();

    // Send in-app notification about document generation
    const studentData = getSelectedStudentData();
    if (studentData) {
      try {
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        
        if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map(r => r.user_id);
          await notifyDocumentGenerated(adminIds, studentData.profiles.full_name, type);
        }
      } catch (err) {
        console.error('Failed to send document notification:', err);
      }
    }
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
        </div>

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
            </div>
          </CardContent>
        </Card>

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

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Academic Results</CardTitle>
                <CardDescription>Approved results for all semesters</CardDescription>
              </CardHeader>
              <CardContent>
                {studentResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No approved results found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Name</th>
                          <th>Semester</th>
                          <th>CU</th>
                          <th>Marks</th>
                          <th>Grade</th>
                          <th>GP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentResults.map(result => (
                          <tr key={result.id}>
                            <td className="font-mono">{result.student_courses.courses.code}</td>
                            <td>{result.student_courses.courses.name}</td>
                            <td className="text-sm">{result.student_courses.semesters.name}</td>
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
                )}
              </CardContent>
            </Card>
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
            <div className="flex justify-end mb-4">
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
              
              <div className="student-info">
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

              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Semester</th>
                    <th>CU</th>
                    <th>Marks</th>
                    <th>Grade</th>
                    <th>GP</th>
                  </tr>
                </thead>
                <tbody>
                  {studentResults.map(result => (
                    <tr key={result.id}>
                      <td>{result.student_courses.courses.code}</td>
                      <td>{result.student_courses.courses.name}</td>
                      <td>{result.student_courses.semesters.name}</td>
                      <td>{result.student_courses.courses.credit_units}</td>
                      <td>{result.total_marks}</td>
                      <td>{result.grade}</td>
                      <td>{result.grade_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
            <div className="flex justify-end mb-4">
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
                    <p style={{ fontSize: '16px', marginTop: '20px' }}>has successfully completed the requirements for</p>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', margin: '10px 0', color: '#333', fontStyle: 'italic' }}>
                      {selectedStudentData?.programs.name}
                    </div>
                    <p style={{ fontSize: '16px', marginTop: '20px' }}>
                      with a Cumulative Grade Point Average of <strong>{cgpa}</strong>
                    </p>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', color: '#b8860b', fontWeight: 'bold', marginTop: '10px' }}>
                      {getClassification(cgpa)}
                    </div>
                    {/* Decorative seal */}
                    <div style={{ width: '80px', height: '80px', margin: '20px auto', border: '3px solid #b8860b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', textAlign: 'center', color: '#b8860b', fontWeight: 'bold', textTransform: 'uppercase' as const }}>
                      Official<br/>Seal
                    </div>
                    <p style={{ fontSize: '14px', marginTop: '10px', color: '#666', fontStyle: 'italic' }}>
                      Awarded on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  <div className="signature" style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Principal</div>
                    <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Academic Registrar</div>
                    <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Official Stamp</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
