import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, CreditCard, GraduationCap, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpenseReports } from '@/components/reports/ExpenseReports';
import { ExportDialog } from '@/components/reports/ExportDialog';
import {
  PAYMENT_COLUMNS, fetchPayments, summarisePayments,
  EXPENSE_COLUMNS, fetchExpenses, summariseExpenses,
  ENROLLMENT_COLUMNS, fetchEnrollments, summariseEnrollments,
  RESULT_COLUMNS, fetchResults, summariseResults,
} from '@/lib/csvExport';

function ExportTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Download className="w-4 h-4 mr-2" /> Export CSV
    </Button>
  );
}
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const COLORS = ['hsl(222, 65%, 25%)', 'hsl(173, 58%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(142, 76%, 36%)'];

function PaymentReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-payments'],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method, semesters:semester_id (name)')
        .order('payment_date');
      if (error) throw error;

      // Monthly trend
      const monthlyMap: Record<string, number> = {};
      const methodMap: Record<string, number> = {};
      const semesterMap: Record<string, number> = {};

      payments?.forEach((p: any) => {
        const month = new Date(p.payment_date).toLocaleDateString('en', { month: 'short', year: '2-digit' });
        monthlyMap[month] = (monthlyMap[month] || 0) + parseFloat(p.amount);
        const method = (p.payment_method || 'cash').replace('_', ' ');
        methodMap[method] = (methodMap[method] || 0) + parseFloat(p.amount);
        const sem = p.semesters?.name || 'Unknown';
        semesterMap[sem] = (semesterMap[sem] || 0) + parseFloat(p.amount);
      });

      return {
        monthly: Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })),
        methods: Object.entries(methodMap).map(([name, value]) => ({ name, value })),
        semesters: Object.entries(semesterMap).map(([name, amount]) => ({ name, amount })),
        total: payments?.reduce((s, p) => s + parseFloat(p.amount as any), 0) || 0,
        count: payments?.length || 0,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Payment Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => `UGX ${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data?.methods} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data?.methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `UGX ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Semester</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.semesters} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis type="number" fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <YAxis type="category" dataKey="name" fontSize={11} width={150} />
              <Tooltip formatter={(v: number) => `UGX ${v.toLocaleString()}`} />
              <Bar dataKey="amount" fill="hsl(222, 65%, 25%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function EnrollmentReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-enrollments'],
    queryFn: async () => {
      const { data: students, error } = await supabase
        .from('students')
        .select('status, current_year, programs:program_id (name, code)');
      if (error) throw error;

      const programMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      const yearMap: Record<string, number> = {};

      students?.forEach((s: any) => {
        const prog = s.programs?.code || 'Unknown';
        programMap[prog] = (programMap[prog] || 0) + 1;
        statusMap[s.status] = (statusMap[s.status] || 0) + 1;
        const yr = `Year ${s.current_year}`;
        yearMap[yr] = (yearMap[yr] || 0) + 1;
      });

      return {
        programs: Object.entries(programMap).map(([name, count]) => ({ name, count })),
        statuses: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
        years: Object.entries(yearMap).map(([name, count]) => ({ name, count })),
        total: students?.length || 0,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto opacity-80" />
            <p className="text-3xl font-bold mt-2">{data?.total}</p>
            <p className="text-sm opacity-80">Total Students</p>
          </CardContent>
        </Card>
        <Card className="bg-success text-success-foreground">
          <CardContent className="pt-6 text-center">
            <GraduationCap className="w-8 h-8 mx-auto opacity-80" />
            <p className="text-3xl font-bold mt-2">{data?.statuses.find(s => s.name === 'active')?.value || 0}</p>
            <p className="text-sm opacity-80">Active Students</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary text-secondary-foreground">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="w-8 h-8 mx-auto opacity-80" />
            <p className="text-3xl font-bold mt-2">{data?.programs.length}</p>
            <p className="text-sm opacity-80">Programs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Students by Program</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.programs}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(222, 65%, 25%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Student Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data?.statuses} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data?.statuses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Students by Year of Study</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.years}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-results'],
    queryFn: async () => {
      const { data: results, error } = await supabase
        .from('results')
        .select('grade, status, total_marks, student_courses:student_course_id (courses:course_id (code, name))');
      if (error) throw error;

      const gradeMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};
      const coursePerf: Record<string, { total: number; count: number }> = {};

      results?.forEach((r: any) => {
        if (r.grade) gradeMap[r.grade] = (gradeMap[r.grade] || 0) + 1;
        statusMap[r.status] = (statusMap[r.status] || 0) + 1;
        const code = r.student_courses?.courses?.code || 'Unknown';
        if (!coursePerf[code]) coursePerf[code] = { total: 0, count: 0 };
        coursePerf[code].total += parseFloat(r.total_marks || 0);
        coursePerf[code].count += 1;
      });

      return {
        grades: Object.entries(gradeMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count })),
        statuses: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
        courseAvg: Object.entries(coursePerf).map(([code, { total, count }]) => ({ code, avg: Math.round(total / count) })),
        total: results?.length || 0,
        passRate: results?.length ? Math.round((results.filter((r: any) => r.grade && r.grade !== 'F').length / results.length) * 100) : 0,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{data?.total}</p>
            <p className="text-sm opacity-80">Total Results</p>
          </CardContent>
        </Card>
        <Card className="bg-success text-success-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{data?.passRate}%</p>
            <p className="text-sm opacity-80">Pass Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-warning text-warning-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{data?.statuses.find(s => s.name === 'approved')?.value || 0}</p>
            <p className="text-sm opacity-80">Approved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.grades}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="name" fontSize={14} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data?.grades.map((entry, i) => {
                    const gradeColors: Record<string, string> = { A: 'hsl(142, 76%, 36%)', B: 'hsl(199, 89%, 48%)', C: 'hsl(38, 92%, 50%)', D: 'hsl(25, 95%, 53%)', F: 'hsl(0, 84%, 60%)' };
                    return <Cell key={i} fill={gradeColors[entry.name] || COLORS[i % COLORS.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Results Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data?.statuses} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data?.statuses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Average Score by Course</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.courseAvg}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="code" fontSize={12} />
              <YAxis fontSize={12} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="avg" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Reports() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Visual insights into payments, enrollments, and results</p>
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-2" />Payments</TabsTrigger>
            <TabsTrigger value="expenses"><TrendingDown className="w-4 h-4 mr-2" />Expenses</TabsTrigger>
            <TabsTrigger value="enrollments"><Users className="w-4 h-4 mr-2" />Enrollments</TabsTrigger>
            <TabsTrigger value="results"><GraduationCap className="w-4 h-4 mr-2" />Results</TabsTrigger>
          </TabsList>
          <TabsContent value="payments" className="mt-6 space-y-4">
            <div className="flex justify-end"><ExportButton label="Payments report" onExport={exportPaymentsCSV} /></div>
            <PaymentReports />
          </TabsContent>
          <TabsContent value="expenses" className="mt-6 space-y-4">
            <div className="flex justify-end"><ExportButton label="Expenses report" onExport={exportExpensesCSV} /></div>
            <ExpenseReports />
          </TabsContent>
          <TabsContent value="enrollments" className="mt-6 space-y-4">
            <div className="flex justify-end"><ExportButton label="Enrollments report" onExport={exportEnrollmentsCSV} /></div>
            <EnrollmentReports />
          </TabsContent>
          <TabsContent value="results" className="mt-6 space-y-4">
            <div className="flex justify-end"><ExportButton label="Results report" onExport={exportResultsCSV} /></div>
            <ResultReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
