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
import salemLogo from '@/assets/salem-logo.png';

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

  const printTranscript = () => {
    if (transcriptRef.current) {
      const printContents = transcriptRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=800,width=900');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Academic Transcript</title>');
        printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.header{text-align:center;margin-bottom:20px}.grade-a{color:green}.grade-b{color:blue}.grade-c{color:orange}.grade-d{color:darkorange}.grade-f{color:red}</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

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
          <Button onClick={printTranscript}>
            <Download className="w-4 h-4 mr-2" />
            Download Transcript
          </Button>
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
          <div className="header">
            <h1>Salem Uganda</h1>
            <h2>Academic Transcript</h2>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Name:</strong> {studentData.profile.full_name}</p>
            <p><strong>Student ID:</strong> {studentData.student_id}</p>
            <p><strong>Program:</strong> {studentData.program.name}</p>
            <p><strong>CGPA:</strong> {calculateCGPA()}</p>
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
                  <td className={`grade-${result.grade?.toLowerCase()}`}>{result.grade}</td>
                  <td>{result.grade_point}</td>
                  <td>{result.semester?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <p>Generated on: {new Date().toLocaleDateString()}</p>
            <p style={{ marginTop: '60px' }}>________________________</p>
            <p>Registrar's Signature</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
