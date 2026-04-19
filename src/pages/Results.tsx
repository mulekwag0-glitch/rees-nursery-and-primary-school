import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResultsEntryForm } from '@/components/results/ResultsEntryForm';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { notifyResultsApproved } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';
import {
  ClipboardList,
  CheckCircle,
  Download,
  Loader2,
} from 'lucide-react';

const getGradeBadge = (grade: string | null) => {
  if (!grade) return null;
  const styles: Record<string, string> = {
    A: 'bg-success/20 text-success',
    B: 'bg-primary/20 text-primary',
    C: 'bg-warning/20 text-warning',
    D: 'bg-orange-500/20 text-orange-600',
    F: 'bg-destructive/20 text-destructive',
  };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${styles[grade] || ''}`}>
      {grade}
    </span>
  );
};

function StudentResultsView() {
  const { user } = useAuth();

  const { data: studentResults, isLoading } = useQuery({
    queryKey: ['student-results', user?.id],
    queryFn: async () => {
      // First get the student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (studentError || !student) return [];

      // Get all results for this student
      const { data, error } = await supabase
        .from('student_courses')
        .select(`
          id,
          courses:course_id (
            code,
            name,
            credit_units
          ),
          semesters:semester_id (
            name
          ),
          results (
            coursework_marks,
            exam_marks,
            total_marks,
            grade,
            grade_point,
            status
          )
        `)
        .eq('student_id', student.id);

      if (error) throw error;

      // Group by semester
      const grouped: Record<string, any> = {};
      data?.forEach((sc: any) => {
        const semesterName = sc.semesters?.name || 'Unknown';
        if (!grouped[semesterName]) {
          grouped[semesterName] = { semester: semesterName, courses: [], totalGP: 0, totalCU: 0 };
        }
        const result = sc.results?.[0];
        if (result && result.status === 'approved') {
          const cu = sc.courses?.credit_units || 0;
          const gp = result.grade_point || 0;
          grouped[semesterName].courses.push({
            code: sc.courses?.code,
            name: sc.courses?.name,
            cu,
            cw: result.coursework_marks,
            exam: result.exam_marks,
            total: result.total_marks,
            grade: result.grade,
            gp,
          });
          grouped[semesterName].totalGP += gp * cu;
          grouped[semesterName].totalCU += cu;
        }
      });

      return Object.values(grouped).map((g: any) => ({
        ...g,
        gpa: g.totalCU > 0 ? g.totalGP / g.totalCU : 0,
      }));
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!studentResults?.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground py-8">
            No approved results available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {studentResults.map((semester: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{semester.semester}</CardTitle>
                <CardDescription>Semester GPA: {semester.gpa.toFixed(2)}</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
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
                  {semester.courses.map((course: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-medium">{course.code}</td>
                      <td>{course.name}</td>
                      <td className="text-center">{course.cu}</td>
                      <td className="text-center">{course.cw}</td>
                      <td className="text-center">{course.exam}</td>
                      <td className="text-center font-medium">{course.total}</td>
                      <td className="text-center">{getGradeBadge(course.grade)}</td>
                      <td className="text-center font-medium">{course.gp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminResultsView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingResults, isLoading } = useQuery({
    queryKey: ['pending-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          status,
          created_at,
          student_courses:student_course_id (
            courses:course_id (
              code,
              name
            ),
            semesters:semester_id (
              name
            )
          ),
          profiles:tutor_id (
            full_name
          )
        `)
        .in('status', ['submitted', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by course and status
      const grouped: Record<string, any> = {};
      data?.forEach((r: any) => {
        const courseCode = r.student_courses?.courses?.code || 'Unknown';
        const key = `${courseCode}-${r.status}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: r.id,
            course: courseCode,
            name: r.student_courses?.courses?.name || 'Unknown',
            tutor: r.profiles?.full_name || 'Unknown',
            semester: r.student_courses?.semesters?.name || 'Unknown',
            status: r.status,
            count: 0,
            submitted: r.created_at,
          };
        }
        grouped[key].count++;
      });

      return Object.values(grouped);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (courseCode: string) => {
      // Get student user IDs for notification before approving
      const { data: submittedResults } = await supabase
        .from('results')
        .select('student_course_id, student_courses:student_course_id (students:student_id (user_id), courses:course_id (name))')
        .eq('status', 'submitted');

      // Approve all submitted results
      const { error } = await supabase
        .from('results')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('status', 'submitted');
      if (error) throw error;

      await logAudit('results_approved', 'results', null, null, { course: courseCode });

      // Send notifications to students
      const notified = new Set<string>();
      for (const r of submittedResults || []) {
        const userId = (r as any).student_courses?.students?.user_id;
        const courseName = (r as any).student_courses?.courses?.name;
        if (userId && !notified.has(userId)) {
          notified.add(userId);
          await notifyResultsApproved(userId, courseName || courseCode);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      toast({ title: 'Success', description: 'Results approved successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to approve results', variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (courseCode: string) => {
      const { error } = await supabase
        .from('results')
        .update({ status: 'rejected' })
        .eq('status', 'submitted');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      toast({ title: 'Success', description: 'Results rejected' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reject results', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results Awaiting Approval</CardTitle>
              <CardDescription>Review and approve submitted results</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingResults
                    ?.filter((r: any) => r.status === 'submitted')
                    .map((result: any) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:shadow-soft transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ClipboardList className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {result.course} - {result.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {result.tutor} • {result.count} students • {result.semester}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectMutation.mutate(result.course)}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(result.course)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  {!pendingResults?.filter((r: any) => r.status === 'submitted').length && (
                    <p className="text-center text-muted-foreground py-8">
                      No results pending approval
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approved Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingResults
                  ?.filter((r: any) => r.status === 'approved')
                  .map((result: any) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {result.course} - {result.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {result.count} students • {result.semester}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-success/20 text-success">
                        Approved
                      </Badge>
                    </div>
                  ))}
                {!pendingResults?.filter((r: any) => r.status === 'approved').length && (
                  <p className="text-center text-muted-foreground py-8">No approved results yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Results() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results Management</h1>
          <p className="text-muted-foreground">
            {role === 'student' && 'View your academic results and GPA'}
            {role === 'tutor' && 'Enter and submit student results'}
            {role === 'admin' && 'Review and approve submitted results'}
          </p>
        </div>

        {/* Role-specific view */}
        {(role === 'tutor' || role === 'admin' || role === 'headmistress') && <ResultsEntryForm />}
        {role === 'student' && <StudentResultsView />}
        {(role === 'admin' || role === 'headmistress') && <AdminResultsView />}
      </div>
    </DashboardLayout>
  );
}