import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, Loader2, GraduationCap } from 'lucide-react';

export default function Admissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [programId, setProgramId] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`*, profiles:user_id (full_name, email), programs:program_id (name, code)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const admitMutation = useMutation({
    mutationFn: async () => {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'TempPass123!',
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;

      // Create student record
      const { error: studentError } = await supabase.from('students').insert({
        user_id: authData.user!.id,
        student_id: studentIdNumber,
        program_id: programId,
        status: 'active',
      });
      if (studentError) throw studentError;

      // Assign student role
      await supabase.from('user_roles').insert({ user_id: authData.user!.id, role: 'student' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-students'] });
      toast({ title: 'Success', description: 'Student admitted successfully' });
      setOpen(false);
      setEmail(''); setFullName(''); setProgramId(''); setStudentIdNumber('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredStudents = students?.filter((s: any) =>
    s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admissions</h1>
            <p className="text-muted-foreground">Manage student admissions</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Admit Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Admit New Student</DialogTitle>
                <DialogDescription>Enter student details</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); admitMutation.mutate(); }} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input value={studentIdNumber} onChange={(e) => setStudentIdNumber(e.target.value)} placeholder="STU2024001" required />
                </div>
                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select value={programId} onValueChange={setProgramId} required>
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {programs?.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={admitMutation.isPending}>
                  {admitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Admit Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Student ID</th><th>Name</th><th>Email</th><th>Program</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {filteredStudents?.map((s: any) => (
                      <tr key={s.id}>
                        <td className="font-mono">{s.student_id}</td>
                        <td className="font-medium">{s.profiles?.full_name}</td>
                        <td>{s.profiles?.email}</td>
                        <td>{s.programs?.code}</td>
                        <td><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}