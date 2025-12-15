import React from 'react';
import { StatCard } from './StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function StudentDashboard() {
  const navigate = useNavigate();

  // Mock data
  const studentInfo = {
    name: 'John Mukasa',
    studentId: 'STU2024001',
    program: 'Bachelor of Information Technology',
    year: 2,
    semester: 'Semester 1',
    gpa: 4.23,
    cgpa: 4.15,
  };

  const paymentInfo = {
    totalFee: 2400000,
    paid: 1800000,
    balance: 600000,
    percentage: 75,
  };

  const currentResults = [
    { id: 1, code: 'ICT201', name: 'Database Systems', cu: 4, cw: 35, exam: 52, total: 87, grade: 'A', gp: 5 },
    { id: 2, code: 'ICT202', name: 'Data Structures', cu: 4, cw: 28, exam: 45, total: 73, grade: 'A', gp: 5 },
    { id: 3, code: 'ICT203', name: 'Web Development', cu: 3, cw: 32, exam: 38, total: 70, grade: 'A', gp: 5 },
    { id: 4, code: 'MTH201', name: 'Statistics', cu: 3, cw: 25, exam: 40, total: 65, grade: 'B', gp: 4 },
    { id: 5, code: 'BUS201', name: 'Business Communication', cu: 2, cw: 22, exam: 35, total: 57, grade: 'C', gp: 3 },
  ];

  const getGradeBadge = (grade: string) => {
    const styles: Record<string, string> = {
      'A': 'badge-grade badge-grade-a',
      'B': 'badge-grade badge-grade-b',
      'C': 'badge-grade badge-grade-c',
      'D': 'badge-grade badge-grade-d',
      'F': 'badge-grade badge-grade-f',
    };
    return <span className={styles[grade] || 'badge-grade'}>{grade}</span>;
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Student Portal</h1>
          <p className="text-muted-foreground">Welcome back, {studentInfo.name}!</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/results')}>
            <Download className="w-4 h-4 mr-2" />
            Download Results
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
              <h2 className="text-xl font-bold mb-1">{studentInfo.name}</h2>
              <p className="opacity-80 mb-3">{studentInfo.program}</p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                  {studentInfo.studentId}
                </Badge>
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                  Year {studentInfo.year}
                </Badge>
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                  {studentInfo.semester}
                </Badge>
              </div>
            </div>
            <div className="flex gap-6 sm:gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold">{studentInfo.gpa.toFixed(2)}</p>
                <p className="text-sm opacity-80">Current GPA</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{studentInfo.cgpa.toFixed(2)}</p>
                <p className="text-sm opacity-80">CGPA</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Registered Courses"
          value="5"
          subtitle="This semester"
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          title="Total Credit Units"
          value="16"
          subtitle="Current load"
          icon={GraduationCap}
          variant="secondary"
        />
        <StatCard
          title="Fees Paid"
          value={`${paymentInfo.percentage}%`}
          subtitle={formatCurrency(paymentInfo.paid)}
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="Balance Due"
          value={formatCurrency(paymentInfo.balance)}
          subtitle="Clear before exams"
          icon={AlertCircle}
          variant="warning"
        />
      </div>

      {/* Payment Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payment Status</CardTitle>
              <CardDescription>Semester 1, 2024/2025</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/payments')}>
              View Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{paymentInfo.percentage}% Complete</span>
            </div>
            <Progress value={paymentInfo.percentage} className="h-3" />
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-medium text-success">{formatCurrency(paymentInfo.paid)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Balance: </span>
                <span className="font-medium text-destructive">{formatCurrency(paymentInfo.balance)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Current Semester Results</CardTitle>
            <CardDescription>Semester 1, 2024/2025 - Year 2</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/results')}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course Name</th>
                  <th className="text-center">CU</th>
                  <th className="text-center">CW</th>
                  <th className="text-center">Exam</th>
                  <th className="text-center">Total</th>
                  <th className="text-center">Grade</th>
                  <th className="text-center">GP</th>
                </tr>
              </thead>
              <tbody>
                {currentResults.map((result) => (
                  <tr key={result.id}>
                    <td className="font-medium">{result.code}</td>
                    <td>{result.name}</td>
                    <td className="text-center">{result.cu}</td>
                    <td className="text-center">{result.cw}</td>
                    <td className="text-center">{result.exam}</td>
                    <td className="text-center font-medium">{result.total}</td>
                    <td className="text-center">{getGradeBadge(result.grade)}</td>
                    <td className="text-center font-medium">{result.gp}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30">
                  <td colSpan={2} className="font-semibold">Semester Totals</td>
                  <td className="text-center font-semibold">16</td>
                  <td colSpan={3}></td>
                  <td className="text-center font-semibold">GPA</td>
                  <td className="text-center font-bold text-primary">{studentInfo.gpa.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notice */}
      {paymentInfo.balance > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-warning mb-1">Payment Reminder</h3>
                <p className="text-sm text-muted-foreground">
                  You have an outstanding balance of {formatCurrency(paymentInfo.balance)}. 
                  Please clear your fees before the examination period to avoid any complications.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
