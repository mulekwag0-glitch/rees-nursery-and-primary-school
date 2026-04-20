import React from 'react';
import { StatCard } from './StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  FileText,
  Calendar,
  ClipboardList,
  DollarSign,
  UserPlus,
  Award,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function AdminDashboard() {
  const navigate = useNavigate();

  const { data: studentCount = 0 } = useQuery({
    queryKey: ['dashboard-student-count'],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active');
      return count || 0;
    },
  });

  const { data: totalStudents = 0 } = useQuery({
    queryKey: ['dashboard-total-students'],
    queryFn: async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: courseCount = 0 } = useQuery({
    queryKey: ['dashboard-course-count'],
    queryFn: async () => {
      const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: pendingResults = 0 } = useQuery({
    queryKey: ['dashboard-pending-results'],
    queryFn: async () => {
      const { count } = await supabase.from('results').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
      return count || 0;
    },
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['dashboard-recent-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['dashboard-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.full_name; });
      return map;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/students')}>
            <Users className="w-4 h-4 mr-2" />
            Pupils
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Pupils" value={totalStudents} subtitle={`${studentCount} active`} icon={Users} variant="primary" />
        <StatCard title="Subjects" value={courseCount} subtitle="This term" icon={BookOpen} variant="secondary" />
        <StatCard title="Pending Results" value={pendingResults} subtitle="Awaiting approval" icon={Clock} variant="warning" />
        <StatCard title="Staff Accounts" value="-" subtitle="Teachers & admin" icon={CreditCard} variant="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Pending Result Approvals</CardTitle>
              <CardDescription>Results waiting for your review</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/results')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {pendingResults === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <p className="text-muted-foreground">{pendingResults} result(s) submitted and awaiting approval.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest actions in the system</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {profiles?.[log.user_id] || 'System'} • {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/admissions')}>
              <UserPlus className="w-5 h-5 text-primary" />
              <span>Admit Pupil</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/report-cards')}>
              <FileText className="w-5 h-5 text-secondary" />
              <span>Report Cards</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/attendance')}>
              <ClipboardList className="w-5 h-5 text-accent" />
              <span>Take Attendance</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/accounts')}>
              <DollarSign className="w-5 h-5 text-info" />
              <span>Payments</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/certificates')}>
              <Award className="w-5 h-5 text-primary" />
              <span>Certificates</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/results')}>
              <GraduationCap className="w-5 h-5 text-secondary" />
              <span>Enter Results</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/semesters')}>
              <Calendar className="w-5 h-5 text-accent" />
              <span>Manage Terms</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reports')}>
              <TrendingUp className="w-5 h-5 text-info" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
