import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Search, Edit, Trash2, Loader2, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';

interface Course {
  id: string;
  code: string;
  name: string;
  program_id: string;
  credit_units: number;
  year_of_study: number;
  semester_number: number;
  description: string | null;
  programs?: { name: string; code: string } | null;
}

export default function Courses() {
  const { toast } = useToast();
  const { role } = useAuth();
  const { can } = useModuleAccess();
  const canEdit = can('structures', 'edit', role === 'admin' || role === 'tutor' ? 'full' : 'view');
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const [form, setForm] = useState({
    code: '', name: '', program_id: '', credit_units: 3, year_of_study: 1, semester_number: 1, description: '',
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, programs(name, code)')
        .order('name');
      if (error) throw error;
      return data as Course[];
    },
  });

  const resetForm = () => {
    setForm({ code: '', name: '', program_id: '', credit_units: 3, year_of_study: 1, semester_number: 1, description: '' });
    setEditing(null);
    setOpen(false);
  };

  const startEdit = (c: Course) => {
    setEditing(c);
    setForm({
      code: c.code, name: c.name, program_id: c.program_id,
      credit_units: c.credit_units, year_of_study: c.year_of_study,
      semester_number: c.semester_number, description: c.description || '',
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code || !form.name || !form.program_id) {
        throw new Error('Code, name, and class are required');
      }
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        program_id: form.program_id,
        credit_units: Number(form.credit_units) || 1,
        year_of_study: Number(form.year_of_study) || 1,
        semester_number: Number(form.semester_number) || 1,
        description: form.description || null,
      };
      if (editing) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: editing ? 'Subject updated' : 'Subject created' });
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast({ title: 'Subject deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matches = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    const prog = programFilter === 'all' || c.program_id === programFilter;
    return matches && prog;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subjects</h1>
            <p className="text-muted-foreground">Manage subjects and the grading scale</p>
          </div>
        </div>

        <Tabs defaultValue="subjects">
          <TabsList>
            <TabsTrigger value="subjects" className="gap-2"><BookOpen className="w-4 h-4" />Subjects</TabsTrigger>
            <TabsTrigger value="grading" className="gap-2"><Award className="w-4 h-4" />Grading Scale</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="mt-6 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search subjects..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={programFilter} onValueChange={setProgramFilter}>
                    <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <Button onClick={() => { setEditing(null); setForm({ code: '', name: '', program_id: programs[0]?.id || '', credit_units: 3, year_of_study: 1, semester_number: 1, description: '' }); setOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />Add Subject
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground">No subjects found</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(c => (
                  <Card key={c.id} className="hover:shadow-card transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{c.code}</CardTitle>
                            <Badge variant="secondary" className="text-xs mt-1">{c.programs?.name || '—'}</Badge>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive"
                              onClick={() => { if (confirm(`Delete subject "${c.name}"?`)) deleteMutation.mutate(c.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-medium mb-2">{c.name}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex justify-between"><span>Credit Units</span><span className="font-medium text-foreground">{c.credit_units}</span></div>
                        <div className="flex justify-between"><span>Year / Term</span><span className="font-medium text-foreground">Y{c.year_of_study} / T{c.semester_number}</span></div>
                        {c.description && <p className="text-xs pt-2 border-t border-border mt-2">{c.description}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="grading" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Grading Scale</CardTitle>
                <CardDescription>Uganda New Curriculum competency ratings used for report cards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Rating</th><th>Label</th><th>Min Score</th><th>Max Score</th></tr></thead>
                    <tbody>
                      {[
                        { code: 'BE', label: 'Beyond Expectation', min: 80, max: 100 },
                        { code: 'AE', label: 'Above Expectation', min: 65, max: 79 },
                        { code: 'ME', label: 'Meeting Expectation', min: 50, max: 64 },
                        { code: 'BW', label: 'Below Expectation', min: 0, max: 49 },
                      ].map(r => (
                        <tr key={r.code}>
                          <td className="font-semibold">{r.code}</td>
                          <td>{r.label}</td>
                          <td>{r.min}</td>
                          <td>{r.max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">This grading scale is locked by curriculum policy.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); else setOpen(true); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
              <DialogDescription>Subjects are linked to classes (programs)</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Class *</Label>
                  <Select value={form.program_id} onValueChange={(v) => setForm(f => ({ ...f, program_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Credits</Label>
                  <Input type="number" min={1} value={form.credit_units} onChange={e => setForm(f => ({ ...f, credit_units: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Year</Label>
                  <Input type="number" min={1} value={form.year_of_study} onChange={e => setForm(f => ({ ...f, year_of_study: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Term</Label>
                  <Input type="number" min={1} max={3} value={form.semester_number} onChange={e => setForm(f => ({ ...f, semester_number: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editing ? 'Save Changes' : 'Create Subject'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
