import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Loader2 } from 'lucide-react';

export default function LessonPlans() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');

  const [planClass, setPlanClass] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [planSubject, setPlanSubject] = useState('');
  const [planTopic, setPlanTopic] = useState('');
  const [planObjectives, setPlanObjectives] = useState('');
  const [planActivities, setPlanActivities] = useState('');
  const [planResources, setPlanResources] = useState('');

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: lessonPlans = [], isLoading } = useQuery({
    queryKey: ['lesson-plans', selectedClass],
    queryFn: async () => {
      let query = supabase.from('lesson_plans').select('*, programs:program_id(name)').order('plan_date', { ascending: false });
      if (selectedClass !== 'all') query = query.eq('program_id', selectedClass);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('lesson_plans').insert({
        program_id: planClass,
        plan_date: planDate,
        subject: planSubject,
        topic: planTopic,
        objectives: planObjectives,
        activities: planActivities,
        resources: planResources,
        created_by: user?.id || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });
      toast({ title: 'Lesson plan saved' });
      setShowDialog(false);
      setPlanClass(''); setPlanSubject(''); setPlanTopic(''); setPlanObjectives(''); setPlanActivities(''); setPlanResources('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lesson Plans</h1>
            <p className="text-muted-foreground">Create and manage lesson plans for teachers</p>
          </div>
          <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" />New Plan</Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : lessonPlans.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Lesson Plans</CardTitle>
              <CardDescription>No lesson plans created yet. Click "New Plan" to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No lesson plans found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {lessonPlans.map((plan: any) => (
              <Card key={plan.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{plan.topic}</p>
                      <p className="text-sm text-muted-foreground">{plan.subject} • {plan.plan_date} • {(plan as any).programs?.name}</p>
                      {plan.objectives && <p className="text-sm mt-2 line-clamp-2">{plan.objectives}</p>}
                    </div>
                    <Badge variant="secondary">{plan.subject}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Lesson Plan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={planClass} onValueChange={setPlanClass}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Subject</Label><Input value={planSubject} onChange={e => setPlanSubject(e.target.value)} placeholder="e.g. Literacy" /></div>
              <div className="space-y-2"><Label>Topic</Label><Input value={planTopic} onChange={e => setPlanTopic(e.target.value)} placeholder="e.g. Reading Comprehension" /></div>
              <div className="space-y-2"><Label>Objectives</Label><Textarea value={planObjectives} onChange={e => setPlanObjectives(e.target.value)} rows={3} /></div>
              <div className="space-y-2"><Label>Activities</Label><Textarea value={planActivities} onChange={e => setPlanActivities(e.target.value)} rows={4} /></div>
              <div className="space-y-2"><Label>Resources / Materials</Label><Input value={planResources} onChange={e => setPlanResources(e.target.value)} placeholder="e.g. Textbooks, charts" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !planClass || !planSubject || !planTopic}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
