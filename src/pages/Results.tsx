import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  XCircle,
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
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', user?.id || '').maybeSingle();
      if (!student) return [];

      const { data, error } = await supabase
        .from('student_courses')
        .select(`id, courses:course_id (code, name, credit_units),
          semesters:semester_id (name),
          results (coursework_marks, exam_marks, total_marks, grade, grade_point, status)`)
        .eq('student_id', student.id);
      if (error) throw error;

      const grouped: Record<string, any> = {};
      data?.forEach((sc: any) => {
        const term = sc.semesters?.name || 'Unknown';
        if (!grouped[term]) grouped[term] = { term: term, courses: [], totalGP: 0, totalCU: 0 };
        const result = sc.results?.[0];
        if (result && result.status === 'approved') {
          const cu = sc.courses?.credit_units || 0;
          const gp = result.grade_point || 0;
          grouped[term].courses.push({
            code: sc.courses?.code, name: sc.courses?.name, cu,
            cw: result.coursework_marks, exam: result.exam_marks,
            total: result.total_marks, grade: result.grade, gp,
          });
          grouped[term].totalGP += gp * cu;
          grouped[term].totalCU += cu;
        }
      });
      return Object.values(grouped).map((g: any) => ({ ...g, gpa: g.totalCU > 0 ? g.totalGP / g.totalCU : 0 }));
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (!studentResults?.length) {
    return <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground py-8">No approved results available yet.</p></CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      {studentResults.map((term: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{term.term}</CardTitle>
                <CardDescription>Term GPA: {term.gpa.toFixed(2)}</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Download PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Code</th><th>Subject</th><th className="text-center">Total / 100</th><th className="text-center">Grade</th></tr></thead>
                <tbody>
                  {term.courses.map((course: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-medium">{course.code}</td>
                      <td>{course.name}</td>
                      <td className="text-center font-medium">{course.total}</td>
                      <td className="text-center">{getGradeBadge(course.grade)}</td>
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

interface PendingBatch {
  key: string;
  ids: string[];
  course: string;
  name: string;
  tutor: string;
  term: string;
  status: string;
  count: number;
  submitted: string;
  rejection_reason?: string | null;
}

function AdminResultsView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<PendingBatch | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: batches, isLoading } = useQuery({
    queryKey: ['pending-results'],
    queryFn: async (): Promise<PendingBatch[]> => {
      const { data, error } = await supabase
        .from('results')
        .select(`id, status, created_at, rejection_reason, tutor_id,
          student_courses:student_course_id (
            courses:course_id (code, name),
            semesters:semester_id (name)
          )`)
        .in('status', ['submitted', 'approved', 'rejected'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch tutor names separately — results.tutor_id has no FK to profiles
      const tutorIds = Array.from(
        new Set((data || []).map((r: any) => r.tutor_id).filter(Boolean))
      );
      const tutorNames: Record<string, string> = {};
      if (tutorIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', tutorIds);
        (profs || []).forEach((p: any) => { tutorNames[p.id] = p.full_name; });
      }

      const grouped: Record<string, PendingBatch> = {};
      (data || []).forEach((r: any) => {
        const courseCode = r.student_courses?.courses?.code || 'Unknown';
        const term = r.student_courses?.semesters?.name || 'Unknown';
        const tutor = tutorNames[r.tutor_id] || 'Unknown';
        const key = `${courseCode}__${term}__${r.status}`;
        if (!grouped[key]) {
          grouped[key] = {
            key, ids: [],
            course: courseCode,
            name: r.student_courses?.courses?.name || 'Unknown',
            tutor, term, status: r.status, count: 0,
            submitted: r.created_at,
            rejection_reason: r.rejection_reason,
          };
        }
        grouped[key].ids.push(r.id);
        grouped[key].count++;
      });
      return Object.values(grouped);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (batch: PendingBatch) => {
      const { data: rows } = await supabase
        .from('results')
        .select('student_course_id, student_courses:student_course_id (students:student_id (user_id), courses:course_id (name))')
        .in('id', batch.ids);

      const { error } = await supabase
        .from('results')
        .update({ status: 'approved', approved_at: new Date().toISOString(), rejection_reason: null })
        .in('id', batch.ids);
      if (error) throw error;

      await logAudit('results_approved', 'results', null, null, { course: batch.course, term: batch.term, count: batch.count });

      const notified = new Set<string>();
      for (const r of rows || []) {
        const userId = (r as any).student_courses?.students?.user_id;
        const courseName = (r as any).student_courses?.courses?.name;
        if (userId && !notified.has(userId)) {
          notified.add(userId);
          await notifyResultsApproved(userId, courseName || batch.course);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      toast({ title: 'Approved', description: 'Results approved and pupils notified' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message || 'Failed to approve', variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ batch, reason }: { batch: PendingBatch; reason: string }) => {
      const { error } = await supabase
        .from('results')
        .update({ status: 'rejected', rejection_reason: reason })
        .in('id', batch.ids);
      if (error) throw error;
      await logAudit('results_rejected', 'results', null, null, { course: batch.course, term: batch.term, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      toast({ title: 'Sent back to tutor', description: 'Tutor will see your comment and can resubmit.' });
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message || 'Failed to reject', variant: 'destructive' }),
  });

  const submitted = batches?.filter(b => b.status === 'submitted') || [];
  const approved = batches?.filter(b => b.status === 'approved') || [];
  const rejected = batches?.filter(b => b.status === 'rejected') || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval ({submitted.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Sent Back ({rejected.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results Awaiting Approval</CardTitle>
              <CardDescription>Review and approve, or send back with a comment</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : !submitted.length ? (
                <p className="text-center text-muted-foreground py-8">No results pending approval</p>
              ) : (
                <div className="space-y-4">
                  {submitted.map((b) => (
                    <div key={b.key} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-soft transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ClipboardList className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{b.course} - {b.name}</h3>
                          <p className="text-sm text-muted-foreground">{b.tutor} • {b.count} pupils • {b.term}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm" onClick={() => setRejectTarget(b)}>
                          Send Back
                        </Button>
                        <Button size="sm" onClick={() => approveMutation.mutate(b)} disabled={approveMutation.isPending}>
                          {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Approved Results</CardTitle></CardHeader>
            <CardContent>
              {!approved.length ? (
                <p className="text-center text-muted-foreground py-8">No approved results yet</p>
              ) : (
                <div className="space-y-4">
                  {approved.map((b) => (
                    <div key={b.key} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{b.course} - {b.name}</h3>
                          <p className="text-sm text-muted-foreground">{b.count} pupils • {b.term}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-success/20 text-success">Approved</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sent Back to Tutor</CardTitle>
              <CardDescription>These results were returned with a comment for revision</CardDescription>
            </CardHeader>
            <CardContent>
              {!rejected.length ? (
                <p className="text-center text-muted-foreground py-8">No results sent back</p>
              ) : (
                <div className="space-y-4">
                  {rejected.map((b) => (
                    <div key={b.key} className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-destructive" />
                          <div>
                            <h3 className="font-semibold">{b.course} - {b.name}</h3>
                            <p className="text-xs text-muted-foreground">{b.tutor} • {b.count} pupils • {b.term}</p>
                          </div>
                        </div>
                        <Badge variant="destructive">Rejected</Badge>
                      </div>
                      {b.rejection_reason && (
                        <div className="mt-2 pl-8 text-sm">
                          <span className="font-medium text-destructive">Comment: </span>
                          <span className="italic">{b.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject with comment dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send results back to tutor</DialogTitle>
            <DialogDescription>
              {rejectTarget && `${rejectTarget.course} - ${rejectTarget.name} • ${rejectTarget.term} • ${rejectTarget.count} pupils`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason / instructions for the tutor *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Please re-check the exam marks for the top three pupils — the totals don't add up."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectTarget && rejectMutation.mutate({ batch: rejectTarget, reason: rejectReason.trim() })}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Back with Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Results() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results Management</h1>
          <p className="text-muted-foreground">
            {role === 'tutor' && 'Enter and submit pupil results — Headmistress will approve'}
            {role === 'headmistress' && 'Review, approve, or send results back to teachers with a comment'}
            {role === 'admin' && 'Full oversight: enter, approve, or override results'}
            {role === 'finance' && 'View approved results'}
          </p>
        </div>

        {(role === 'tutor' || role === 'admin' || role === 'headmistress') && <ResultsEntryForm />}
        {role === 'student' && <StudentResultsView />}
        {(role === 'admin' || role === 'headmistress') && <AdminResultsView />}
      </div>
    </DashboardLayout>
  );
}
