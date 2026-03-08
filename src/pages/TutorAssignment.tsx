import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, BookOpen, User } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function TutorAssignment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ tutor_id: '', course_id: '', semester_id: '' });

  // Fetch tutors (users with tutor role)
  const { data: tutors } = useQuery({
    queryKey: ['tutors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, profiles:user_id (id, full_name, email)')
        .eq('role', 'tutor');
      if (error) throw error;
      return data?.map((r: any) => ({ id: r.user_id, name: r.profiles?.full_name, email: r.profiles?.email })) || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('id, code, name, programs:program_id (code)').order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('semesters').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['tutor-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_courses')
        .select(`
          id, tutor_id, course_id, semester_id,
          profiles:tutor_id (full_name, email),
          courses:course_id (code, name, programs:program_id (code)),
          semesters:semester_id (name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('tutor_courses').insert({
        tutor_id: data.tutor_id,
        course_id: data.course_id,
        semester_id: data.semester_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-assignments'] });
      toast({ title: 'Success', description: 'Tutor assigned to course' });
      setFormData({ tutor_id: '', course_id: '', semester_id: '' });
      setDialogOpen(false);
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tutor_courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-assignments'] });
      toast({ title: 'Success', description: 'Assignment removed' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tutor Assignments</h1>
            <p className="text-muted-foreground">Assign tutors to courses for each semester</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Assign Tutor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Tutor to Course</DialogTitle>
                <DialogDescription>Select a tutor, course, and semester</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Tutor</Label>
                  <Select value={formData.tutor_id} onValueChange={(v) => setFormData({ ...formData, tutor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tutor" /></SelectTrigger>
                    <SelectContent>
                      {tutors?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!tutors?.length && <p className="text-xs text-muted-foreground mt-1">No tutors found. Create a user with the tutor role first.</p>}
                </div>
                <div>
                  <Label>Course</Label>
                  <Select value={formData.course_id} onValueChange={(v) => setFormData({ ...formData, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Semester</Label>
                  <Select value={formData.semester_id} onValueChange={(v) => setFormData({ ...formData, semester_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      {semesters?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => assignMutation.mutate(formData)} disabled={assignMutation.isPending || !formData.tutor_id || !formData.course_id || !formData.semester_id}>
                  {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Assignments</CardTitle>
            <CardDescription>Tutors assigned to courses this semester</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !assignments?.length ? (
              <p className="text-center text-muted-foreground py-8">No tutor assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{(a.profiles as any)?.full_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="secondary">{(a.courses as any)?.code}</Badge>
                        <span className="text-sm text-muted-foreground">{(a.courses as any)?.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(a.semesters as any)?.name} • {(a.courses as any)?.programs?.code}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeMutation.mutate(a.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
