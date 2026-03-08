import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, Loader2, GraduationCap, Phone, MapPin } from 'lucide-react';
import { notifyStudentAdmitted } from '@/lib/notifications';

export default function Admissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [programId, setProgramId] = useState('');
  const [currentYear, setCurrentYear] = useState('1');

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: students, isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`*, profiles:user_id (full_name, email, phone), programs:program_id (name, code)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-generate student ID
  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const count = (students?.length || 0) + 1;
    return `STU${year}${count.toString().padStart(3, '0')}`;
  };

  const admitMutation = useMutation({
    mutationFn: async () => {
      const studentIdNumber = generateStudentId();
      const tempPassword = `Salem${new Date().getFullYear()}!`;

      // Use the create-user edge function (runs as admin, doesn't affect current session)
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password: tempPassword,
          full_name: fullName,
          role: 'student',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const userId = data.user?.id || data.userId;
      if (!userId) throw new Error('Failed to create user account');

      // Update profile with phone if provided
      if (phone) {
        await supabase.from('profiles').update({ phone }).eq('id', userId);
      }

      // Create student record
      const { error: studentError } = await supabase.from('students').insert({
        user_id: userId,
        student_id: studentIdNumber,
        program_id: programId,
        current_year: parseInt(currentYear),
        status: 'active',
      });
      if (studentError) throw studentError;

      return { studentIdNumber, tempPassword };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-students'] });
      toast({
        title: 'Student Admitted Successfully',
        description: `ID: ${data.studentIdNumber} | Temporary password: ${data.tempPassword}`,
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setProgramId('');
    setCurrentYear('1');
    setOpen(false);
  };

  const filteredStudents = students?.filter((s: any) => {
    const matchesSearch =
      s.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: students?.length || 0,
    active: students?.filter((s: any) => s.status === 'active').length || 0,
    inactive: students?.filter((s: any) => s.status === 'inactive').length || 0,
    graduated: students?.filter((s: any) => s.status === 'graduated').length || 0,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admissions</h1>
            <p className="text-muted-foreground">Admit new students and manage enrollment</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Admit Student</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Admit New Student</DialogTitle>
                <DialogDescription>
                  A user account will be created automatically. The student ID is auto-generated.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); admitMutation.mutate(); }} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Kato" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Program *</Label>
                    <Select value={programId} onValueChange={setProgramId} required>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {programs?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year of Study</Label>
                    <Select value={currentYear} onValueChange={setCurrentYear}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="text-muted-foreground">
                    <strong>Auto-generated ID:</strong> {generateStudentId()}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    <strong>Temp Password:</strong> Salem{new Date().getFullYear()}!
                  </p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={admitMutation.isPending || !fullName || !email || !programId}>
                    {admitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Admit Student
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Summary */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {(['all', 'active', 'inactive', 'graduated'] as const).map((status) => (
            <Card
              key={status}
              className={`cursor-pointer transition-shadow hover:shadow-md ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold">{statusCounts[status]}</p>
                <p className="text-xs text-muted-foreground capitalize">{status === 'all' ? 'Total' : status}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Student List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, ID, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filteredStudents?.length ? (
              <p className="text-center text-muted-foreground py-8">No students found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Program</th>
                      <th>Year</th>
                      <th>Status</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s: any) => (
                      <tr key={s.id}>
                        <td className="font-mono text-sm">{s.student_id}</td>
                        <td className="font-medium">{s.profiles?.full_name}</td>
                        <td className="text-sm text-muted-foreground">{s.profiles?.email}</td>
                        <td><Badge variant="secondary">{s.programs?.code}</Badge></td>
                        <td className="text-center">{s.current_year}</td>
                        <td>
                          <Badge
                            variant={s.status === 'active' ? 'default' : 'secondary'}
                            className={s.status === 'active' ? 'bg-success/20 text-success border-0' : ''}
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {new Date(s.enrollment_date).toLocaleDateString()}
                        </td>
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
