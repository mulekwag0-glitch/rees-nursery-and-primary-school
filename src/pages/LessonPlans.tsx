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
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Plus, FileText, Loader2 } from 'lucide-react';

export default function LessonPlans() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState('all');

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Lesson Plans</CardTitle>
            <CardDescription>No lesson plans created yet. Click "New Plan" to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No lesson plans found</p>
              <p className="text-sm">Create your first lesson plan to get started</p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Lesson Plan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="space-y-2"><Label>Subject</Label><Input placeholder="e.g. Literacy" /></div>
              <div className="space-y-2"><Label>Topic</Label><Input placeholder="e.g. Reading Comprehension" /></div>
              <div className="space-y-2"><Label>Objectives</Label><Textarea placeholder="What pupils will learn..." rows={3} /></div>
              <div className="space-y-2"><Label>Activities</Label><Textarea placeholder="Teaching activities and methods..." rows={4} /></div>
              <div className="space-y-2"><Label>Resources / Materials</Label><Input placeholder="e.g. Textbooks, charts, markers" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'Lesson plan saved' }); setShowDialog(false); }}>Save Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
