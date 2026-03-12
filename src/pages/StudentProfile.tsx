import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  CreditCard,
  FileText,
  Download,
  Loader2,
  User,
  Calendar,
  BookOpen,
  Award,
  Printer,
} from 'lucide-react';
import hfiLogo from '@/assets/hfi-logo.png';
import { QRCodeSVG } from 'qrcode.react';

interface StudentData {
  id: string;
  student_id: string;
  current_year: number;
  status: string;
  enrollment_date: string;
  program: {
    id: string;
    name: string;
    code: string;
    duration_years: number;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  };
}

interface ResultData {
  id: string;
  coursework_marks: number;
  exam_marks: number;
  total_marks: number;
  grade: string;
  grade_point: number;
  status: string;
  course: {
    code: string;
    name: string;
    credit_units: number;
  };
  semester: {
    name: string;
    academic_year: {
      name: string;
    };
  };
}

interface PaymentData {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  semester: {
    name: string;
    academic_year: {
      name: string;
    };
  };
}

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [results, setResults] = useState<ResultData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      // Fetch student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          current_year,
          status,
          enrollment_date,
          program:programs(id, name, code, duration_years)
        `)
        .eq('user_id', user?.id)
        .single();

      if (studentError) throw studentError;

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      setStudentData({
        ...student,
        program: student.program as StudentData['program'],
        profile: profile,
      });

      // Fetch results
      const { data: studentCourses } = await supabase
        .from('student_courses')
        .select('id, course:courses(code, name, credit_units), semester:semesters(name, academic_year:academic_years(name))')
        .eq('student_id', student.id);

      if (studentCourses) {
        const courseIds = studentCourses.map(sc => sc.id);
        const { data: resultsData } = await supabase
          .from('results')
          .select('*')
          .in('student_course_id', courseIds)
          .eq('status', 'approved');

        if (resultsData) {
          const mappedResults = resultsData.map(result => {
            const sc = studentCourses.find(c => c.id === result.student_course_id);
            return {
              ...result,
              course: sc?.course as ResultData['course'],
              semester: sc?.semester as ResultData['semester'],
            };
          });
          setResults(mappedResults);
        }
      }

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          receipt_number,
          semester:semesters(name, academic_year:academic_years(name))
        `)
        .eq('student_id', student.id)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData as PaymentData[]);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCGPA = () => {
    if (results.length === 0) return 0;
    let totalPoints = 0;
    let totalCredits = 0;
    results.forEach(r => {
      if (r.course) {
        totalPoints += (r.grade_point || 0) * r.course.credit_units;
        totalCredits += r.course.credit_units;
      }
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  const getClassification = (cgpa: number) => {
    if (cgpa >= 4.5) return 'First Class Honours';
    if (cgpa >= 3.5) return 'Second Class Honours (Upper Division)';
    if (cgpa >= 2.5) return 'Second Class Honours (Lower Division)';
    if (cgpa >= 2.0) return 'Pass';
    return 'Fail';
  };

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>, title: string) => {
    if (!ref.current) return;
    const printWindow = window.open('', '', 'height=800,width=900');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>${title}</title>`);
    printWindow.document.write(`<style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&display=swap');
      body{font-family:'Lora','Times New Roman',serif;padding:20px;max-width:800px;margin:0 auto;line-height:1.6}
      .header{text-align:center;border-bottom:2px solid #1a365d;padding-bottom:20px;margin-bottom:30px}
      .logo{font-family:'Playfair Display',serif;font-size:28px;font-weight:bold;color:#1a365d;letter-spacing:3px}
      .subtitle{font-size:14px;color:#666;letter-spacing:2px;text-transform:uppercase}
      .title{font-family:'Playfair Display',serif;font-size:22px;font-weight:bold;margin:20px 0;text-transform:uppercase;color:#1a365d;letter-spacing:2px}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{border:1px solid #333;padding:8px;text-align:left}
      th{background:#1a365d;color:white}
      .signature{margin-top:60px;display:flex;justify-content:space-between}
      .signature-line{width:200px;border-top:1px solid #000;padding-top:5px;text-align:center;font-size:13px}
      .info-row{display:flex;margin-bottom:8px}
      .info-label{width:150px;font-weight:bold}
    </style>`);
    printWindow.document.write('</head><body>');
    printWindow.document.write(ref.current.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const getTotalPayments = () => {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getGradeBadge = (grade: string) => {
    const styles: Record<string, string> = {
      'A': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'F': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <Badge className={styles[grade] || ''}>{grade}</Badge>;
  };

  const cgpa = parseFloat(calculateCGPA() as string);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!studentData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Student Record</h2>
              <p className="text-muted-foreground">
                No student record is linked to your account. Please contact the administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">View your academic record and payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handlePrint(transcriptRef, 'Academic Transcript')}>
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </Button>
            <Button onClick={() => handlePrint(certificateRef, 'Certificate')}>
              <Award className="w-4 h-4 mr-2" />
              Certificate
            </Button>
          </div>
        </div>

        {/* Student Info Card */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <GraduationCap className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">{studentData.profile.full_name}</h2>
                <p className="opacity-80 mb-3">{studentData.program.name}</p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    {studentData.student_id}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                    Year {studentData.current_year}
                  </Badge>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0 capitalize">
                    {studentData.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-6 sm:gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold">{calculateCGPA()}</p>
                  <p className="text-sm opacity-80">CGPA</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{results.length}</p>
                  <p className="text-sm opacity-80">Courses</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{results.length}</p>
                  <p className="text-sm text-muted-foreground">Completed Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Award className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{calculateCGPA()}</p>
                  <p className="text-sm text-muted-foreground">CGPA</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(getTotalPayments())}</p>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Calendar className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{new Date(studentData.enrollment_date).getFullYear()}</p>
                  <p className="text-sm text-muted-foreground">Enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList>
            <TabsTrigger value="results">Academic Results</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="info">Personal Info</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Academic Results</CardTitle>
                <CardDescription>All your approved course results</CardDescription>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No results available yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Code</th>
                          <th className="text-left py-3 px-4 font-medium">Course</th>
                          <th className="text-center py-3 px-4 font-medium">CU</th>
                          <th className="text-center py-3 px-4 font-medium">CW</th>
                          <th className="text-center py-3 px-4 font-medium">Exam</th>
                          <th className="text-center py-3 px-4 font-medium">Total</th>
                          <th className="text-center py-3 px-4 font-medium">Grade</th>
                          <th className="text-center py-3 px-4 font-medium">GP</th>
                          <th className="text-left py-3 px-4 font-medium">Semester</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((result) => (
                          <tr key={result.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{result.course?.code}</td>
                            <td className="py-3 px-4">{result.course?.name}</td>
                            <td className="py-3 px-4 text-center">{result.course?.credit_units}</td>
                            <td className="py-3 px-4 text-center">{result.coursework_marks}</td>
                            <td className="py-3 px-4 text-center">{result.exam_marks}</td>
                            <td className="py-3 px-4 text-center font-medium">{result.total_marks}</td>
                            <td className="py-3 px-4 text-center">{getGradeBadge(result.grade || '-')}</td>
                            <td className="py-3 px-4 text-center font-medium">{result.grade_point}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {result.semester?.name} - {result.semester?.academic_year?.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All your recorded payments</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Receipt #</th>
                          <th className="text-left py-3 px-4 font-medium">Date</th>
                          <th className="text-left py-3 px-4 font-medium">Semester</th>
                          <th className="text-left py-3 px-4 font-medium">Method</th>
                          <th className="text-right py-3 px-4 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-mono">{payment.receipt_number}</td>
                            <td className="py-3 px-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              {payment.semester?.name} - {payment.semester?.academic_year?.name}
                            </td>
                            <td className="py-3 px-4 capitalize">{payment.payment_method}</td>
                            <td className="py-3 px-4 text-right font-medium text-green-600">
                              {formatCurrency(Number(payment.amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/50">
                          <td colSpan={4} className="py-3 px-4 font-semibold">Total Paid</td>
                          <td className="py-3 px-4 text-right font-bold text-green-600">
                            {formatCurrency(getTotalPayments())}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{studentData.profile.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Student ID</p>
                    <p className="font-medium">{studentData.student_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{studentData.profile.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{studentData.profile.phone || 'Not provided'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Program</p>
                    <p className="font-medium">{studentData.program.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Year</p>
                    <p className="font-medium">Year {studentData.current_year}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Enrollment Date</p>
                    <p className="font-medium">{new Date(studentData.enrollment_date).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="capitalize">{studentData.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Hidden Transcript for printing */}
        <div ref={transcriptRef} className="hidden">
          <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #1a365d', paddingBottom: '20px', marginBottom: '30px' }}>
            <img src={hfiLogo} alt="HFI" style={{ width: '80px', height: '80px', margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 'bold', color: '#1a365d', letterSpacing: '3px' }}>HUMANITY FIRST INSTITUTE</div>
            <div style={{ fontSize: '14px', color: '#666', letterSpacing: '2px' }}>VOCATIONAL TRAINING INSTITUTE</div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 'bold', marginTop: '20px', color: '#1a365d', letterSpacing: '2px' }}>OFFICIAL ACADEMIC TRANSCRIPT</div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', marginBottom: '8px' }}><span style={{ width: '150px', fontWeight: 'bold' }}>Student Name:</span><span>{studentData.profile.full_name}</span></div>
            <div style={{ display: 'flex', marginBottom: '8px' }}><span style={{ width: '150px', fontWeight: 'bold' }}>Student ID:</span><span>{studentData.student_id}</span></div>
            <div style={{ display: 'flex', marginBottom: '8px' }}><span style={{ width: '150px', fontWeight: 'bold' }}>Program:</span><span>{studentData.program.name}</span></div>
            <div style={{ display: 'flex', marginBottom: '8px' }}><span style={{ width: '150px', fontWeight: 'bold' }}>Enrollment Date:</span><span>{new Date(studentData.enrollment_date).toLocaleDateString()}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Course</th>
                <th>CU</th>
                <th>Total</th>
                <th>Grade</th>
                <th>GP</th>
                <th>Semester</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td>{result.course?.code}</td>
                  <td>{result.course?.name}</td>
                  <td>{result.course?.credit_units}</td>
                  <td>{result.total_marks}</td>
                  <td>{result.grade}</td>
                  <td>{result.grade_point}</td>
                  <td>{result.semester?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <strong>Cumulative GPA: {cgpa}</strong><br/>
              <strong>Classification: {getClassification(cgpa)}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <QRCodeSVG 
                value={`https://hfi.ac.ug/verify/transcript/${studentData.student_id}?cgpa=${cgpa}&date=${new Date().toISOString().split('T')[0]}`}
                size={80}
              />
              <p style={{ fontSize: '8px', marginTop: '4px', color: '#666' }}>Scan to verify</p>
            </div>
          </div>
          <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Registrar</div>
            <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Date</div>
            <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Official Stamp</div>
          </div>
        </div>

        {/* Hidden Certificate for printing */}
        <div ref={certificateRef} className="hidden">
          <div style={{ position: 'relative', border: '8px double #b8860b', padding: '60px 40px', background: 'linear-gradient(135deg, #fffef5 0%, #fff 50%, #fffef5 100%)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', bottom: '15px', border: '2px solid #b8860b', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '100px', color: 'rgba(26, 54, 93, 0.04)', fontWeight: 'bold', letterSpacing: '10px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
              HUMANITY FIRST
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center' }}>
                <img src={hfiLogo} alt="HFI" style={{ width: '100px', height: '100px', margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a365d', letterSpacing: '3px' }}>HUMANITY FIRST INSTITUTE</div>
                <div style={{ fontSize: '14px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase' }}>Vocational Training Institute</div>
                <div style={{ textAlign: 'center', color: '#b8860b', fontSize: '24px', margin: '10px 0', letterSpacing: '8px' }}>✦ ✦ ✦</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '20px', textTransform: 'uppercase', color: '#1a365d', letterSpacing: '2px' }}>Certificate of Completion</div>
              </div>
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <p style={{ fontSize: '16px' }}>This is to certify that</p>
                <div style={{ fontSize: '36px', fontWeight: 'bold', margin: '15px auto', color: '#1a365d', borderBottom: '2px solid #b8860b', display: 'inline-block', paddingBottom: '5px' }}>
                  {studentData.profile.full_name}
                </div>
                <p style={{ fontSize: '16px' }}>Student ID: {studentData.student_id}</p>
                <p style={{ fontSize: '16px', marginTop: '20px' }}>has successfully completed the requirements for</p>
                <div style={{ fontSize: '22px', margin: '10px 0', color: '#333', fontStyle: 'italic' }}>{studentData.program.name}</div>
                <p style={{ fontSize: '16px', marginTop: '20px' }}>
                  with a Cumulative Grade Point Average of <strong>{cgpa}</strong>
                </p>
                <div style={{ fontSize: '20px', color: '#b8860b', fontWeight: 'bold', marginTop: '10px' }}>
                  {getClassification(cgpa)}
                </div>
                <div style={{ width: '80px', height: '80px', margin: '20px auto', border: '3px solid #b8860b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', textAlign: 'center', color: '#b8860b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Official<br/>Seal
                </div>
                <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                  Awarded on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Principal</div>
                <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Academic Registrar</div>
                <div style={{ width: '200px', borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'center', fontSize: '13px' }}>Official Stamp</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
