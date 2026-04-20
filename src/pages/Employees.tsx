import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Loader2, Users, Trash2, Edit, Upload } from 'lucide-react';
import { employeeSchema, validateForm } from '@/lib/validation';
import { STAFF_IMPORT } from '@/lib/staffImportData';

const DEPARTMENTS = [
  'Administration', 'Academic', 'Finance', 'IT', 'Library', 'Maintenance', 'Security', 'General',
];

export default function Employees() {
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('General');
  const [jobTitle, setJobTitle] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [salary, setSalary] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [nssfNumber, setNssfNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const v = validateForm(employeeSchema, {
        fullName, email, phone, department, jobTitle, hireDate,
        salary: parseFloat(salary) || 0, bankName, bankAccount, nssfNumber, tinNumber,
      });
      const { error } = await supabase.from('employees').insert({
        full_name: v.fullName,
        email: v.email || `${v.fullName.toLowerCase().replace(/\s+/g, '.')}@rees.local`,
        phone: v.phone || null,
        department: v.department.toLowerCase(),
        job_title: v.jobTitle,
        hire_date: v.hireDate,
        salary: v.salary,
        bank_name: v.bankName || null,
        bank_account: v.bankAccount || null,
        nssf_number: v.nssfNumber || null,
        tin_number: v.tinNumber || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Employee Added', description: 'Employee record created successfully.' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Deleted', description: 'Employee removed.' });
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const existing = new Set((employees || []).map((e: any) => e.full_name.toLowerCase().trim()));
      const rows = STAFF_IMPORT
        .filter((s) => !existing.has(s.full_name.toLowerCase().trim()))
        .map((s) => ({
          full_name: s.full_name,
          email: s.email || `${s.full_name.toLowerCase().replace(/\s+/g, '.')}@rees.local`,
          phone: s.phone || null,
          department: s.job_title.toLowerCase().includes('director') ? 'administration'
            : s.job_title.toLowerCase().includes('secretary') ? 'administration'
            : 'academic',
          job_title: s.job_title,
          hire_date: new Date().toISOString().split('T')[0],
          salary: 0,
          bank_name: s.bank_name || null,
          bank_account: s.bank_account || null,
          nssf_number: s.nssf_number || null,
          tin_number: s.tin_number || null,
        }));
      if (rows.length === 0) return { skipped: STAFF_IMPORT.length, inserted: 0 };
      const { error } = await supabase.from('employees').insert(rows);
      if (error) throw error;
      return { skipped: STAFF_IMPORT.length - rows.length, inserted: rows.length };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Import complete', description: `${r.inserted} added, ${r.skipped} already existed.` });
    },
    onError: (e: any) => toast({ title: 'Import failed', description: e.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setFullName(''); setEmail(''); setPhone(''); setDepartment('General');
    setJobTitle(''); setHireDate(new Date().toISOString().split('T')[0]);
    setSalary(''); setBankName(''); setBankAccount(''); setNssfNumber(''); setTinNumber('');
    setOpen(false);
  };

  const filtered = employees?.filter((e: any) => {
    const matchesSearch = e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'all' || e.department === deptFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const activeCount = employees?.filter((e: any) => e.status === 'active').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">Manage staff and employee records</p>
          </div>
          {role === 'admin' && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import Staff
              </Button>
              <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>Enter employee details</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Full Name *</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email (optional)</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Hire Date</Label>
                      <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Salary (UGX)</Label>
                      <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} min="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Account</Label>
                      <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>NSSF Number</Label>
                      <Input value={nssfNumber} onChange={(e) => setNssfNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>TIN Number</Label>
                      <Input value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending || !fullName || !jobTitle}>
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Employee
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{employees?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Employees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold text-success">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold">{new Set(employees?.map((e: any) => e.department)).size || 0}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filtered?.length ? (
              <p className="text-center text-muted-foreground py-8">No employees found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Job Title</th>
                      <th>Department</th>
                      <th>Email</th>
                      <th>Salary</th>
                      <th>Status</th>
                      {role === 'admin' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any) => (
                      <tr key={e.id}>
                        <td className="font-medium">{e.full_name}</td>
                        <td>{e.job_title}</td>
                        <td><Badge variant="secondary" className="capitalize">{e.department}</Badge></td>
                        <td className="text-sm text-muted-foreground">{e.email}</td>
                        <td className="font-semibold">UGX {parseFloat(e.salary).toLocaleString()}</td>
                        <td>
                          <Badge variant={e.status === 'active' ? 'default' : 'secondary'}
                            className={e.status === 'active' ? 'bg-success/20 text-success border-0' : ''}>
                            {e.status}
                          </Badge>
                        </td>
                        {role === 'admin' && (
                          <td>
                            <Button size="sm" variant="ghost" className="text-destructive"
                              onClick={() => deleteMutation.mutate(e.id)} disabled={deleteMutation.isPending}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        )}
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
