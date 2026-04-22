import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, GraduationCap, Phone, Loader2, CreditCard, FileText, CalendarCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function PupilProfileView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: pupil, isLoading } = useQuery({
    queryKey: ['pupil-profile', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`*, programs:program_id (name, code), profiles:user_id (full_name, email, phone, avatar_url)`)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['pupil-payments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, semesters:semester_id (name)')
        .eq('student_id', id!)
        .order('payment_date', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: feeStructures } = useQuery({
    queryKey: ['pupil-fees', pupil?.program_id],
    queryFn: async () => {
      if (!pupil?.program_id) return [];
      const { data } = await supabase
        .from('fee_structures')
        .select('*, semesters:semester_id (name)')
        .eq('program_id', pupil.program_id);
      return data || [];
    },
    enabled: !!pupil?.program_id,
  });

  const { data: attendance } = useQuery({
    queryKey: ['pupil-attendance', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('attendance_date, status, notes')
        .eq('student_id', id!)
        .order('attendance_date', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: results } = useQuery({
    queryKey: ['pupil-results', id],
    queryFn: async () => {
      const { data: scs } = await supabase
        .from('student_courses')
        .select('id, courses:course_id (name, code), semesters:semester_id (name)')
        .eq('student_id', id!);
      if (!scs?.length) return [];
      const { data: rs } = await supabase
        .from('results')
        .select('*')
        .in('student_course_id', scs.map((s) => s.id));
      return (rs || []).map((r) => ({ ...r, sc: scs.find((s) => s.id === r.student_course_id) }));
    },
    enabled: !!id,
  });

  const totalPaid = (payments || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
  const totalFee = (feeStructures || []).reduce((s, f: any) => s + Number(f.total_fee || 0), 0);
  const balance = totalFee - totalPaid;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!pupil) {
    return (
      <DashboardLayout>
        <Card><CardContent className="pt-6 text-center text-muted-foreground">Pupil not found</CardContent></Card>
      </DashboardLayout>
    );
  }

  const name = pupil.full_name || (pupil as any).profiles?.full_name || '—';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
                {(pupil as any).profiles?.avatar_url ? (
                  <img src={(pupil as any).profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-10 h-10" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{name}</h1>
                <p className="opacity-80 mb-3">{(pupil as any).programs?.name} · Year {pupil.current_year}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">{pupil.student_id}</Badge>
                  <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0 capitalize">{pupil.status}</Badge>
                  {pupil.parent_contact && (
                    <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0">
                      <Phone className="w-3 h-3 mr-1" /> {pupil.parent_contact}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center"><p className="text-xl font-bold">UGX {totalFee.toLocaleString()}</p><p className="text-xs opacity-80">Total Fee</p></div>
                <div className="text-center"><p className="text-xl font-bold">UGX {totalPaid.toLocaleString()}</p><p className="text-xs opacity-80">Paid</p></div>
                <div className="text-center"><p className="text-xl font-bold">UGX {balance.toLocaleString()}</p><p className="text-xs opacity-80">Balance</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1" /> Payments</TabsTrigger>
            <TabsTrigger value="results"><FileText className="w-4 h-4 mr-1" /> Report Card</TabsTrigger>
            <TabsTrigger value="attendance"><CalendarCheck className="w-4 h-4 mr-1" /> Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card>
              <CardHeader><CardTitle className="text-lg">Payment History</CardTitle><CardDescription>{payments?.length || 0} payments recorded</CardDescription></CardHeader>
              <CardContent>
                {!payments?.length ? (
                  <p className="text-center text-muted-foreground py-8">No payments yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Term</th><th>Amount</th><th>Method</th><th>Receipt</th></tr></thead>
                      <tbody>
                        {payments.map((p: any) => (
                          <tr key={p.id}>
                            <td className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                            <td>{p.semesters?.name}</td>
                            <td className="font-semibold text-success">UGX {Number(p.amount).toLocaleString()}</td>
                            <td className="capitalize text-sm">{p.payment_method?.replace('_', ' ')}</td>
                            <td className="font-mono text-xs">{p.receipt_number}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader><CardTitle className="text-lg">Results</CardTitle></CardHeader>
              <CardContent>
                {!results?.length ? (
                  <p className="text-center text-muted-foreground py-8">No results yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr><th>Subject</th><th>Term</th><th>CW</th><th>Exam</th><th>Total</th><th>Grade</th><th>Status</th></tr></thead>
                      <tbody>
                        {results.map((r: any) => (
                          <tr key={r.id}>
                            <td>{r.sc?.courses?.name}</td>
                            <td>{r.sc?.semesters?.name}</td>
                            <td>{r.coursework_marks ?? '-'}</td>
                            <td>{r.exam_marks ?? '-'}</td>
                            <td className="font-semibold">{r.total_marks ?? '-'}</td>
                            <td><Badge>{r.grade || '-'}</Badge></td>
                            <td><Badge variant="secondary" className="capitalize">{r.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader><CardTitle className="text-lg">Recent Attendance</CardTitle><CardDescription>Last 50 records</CardDescription></CardHeader>
              <CardContent>
                {!attendance?.length ? (
                  <p className="text-center text-muted-foreground py-8">No attendance records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Status</th><th>Notes</th></tr></thead>
                      <tbody>
                        {attendance.map((a: any, i: number) => (
                          <tr key={i}>
                            <td>{new Date(a.attendance_date).toLocaleDateString()}</td>
                            <td><Badge variant={a.status === 'present' ? 'default' : 'secondary'} className="capitalize">{a.status}</Badge></td>
                            <td className="text-sm text-muted-foreground">{a.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
