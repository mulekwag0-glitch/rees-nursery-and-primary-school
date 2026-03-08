import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, CheckCircle, XCircle, Calendar, Search } from 'lucide-react';
import { leaveRequestSchema, validateForm } from '@/lib/validation';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'compassionate', label: 'Compassionate Leave' },
  { value: 'study', label: 'Study Leave' },
];

export default function LeaveManagement() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['leave-employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, full_name').eq('status', 'active').order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employees:employee_id (full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const validation = validateForm(leaveRequestSchema, {
        employeeId, leaveType, startDate, endDate, reason,
      });
      if (!validation.success) throw new Error(validation.error);
      const v = validation.data;
      const { error } = await supabase.from('leave_requests').insert({
        employee_id: v.employeeId,
        leave_type: v.leaveType,
        start_date: v.startDate,
        end_date: v.endDate,
        reason: v.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Leave Request Submitted', description: 'Request is pending approval.' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('leave_requests')
        .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: status === 'approved' ? 'Approved' : 'Rejected', description: `Leave request ${status}.` });
    },
  });

  const resetForm = () => {
    setEmployeeId(''); setLeaveType('annual'); setStartDate(''); setEndDate(''); setReason('');
    setOpen(false);
  };

  const filtered = requests?.filter((r: any) => {
    const matchesSearch = r.employees?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests?.filter((r: any) => r.status === 'pending').length || 0;

  const getDays = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leave Management</h1>
            <p className="text-muted-foreground">Manage employee leave requests</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
                <DialogDescription>Request time off for an employee</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || !employeeId || !startDate || !endDate}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{requests?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold text-warning">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold text-success">{requests?.filter((r: any) => r.status === 'approved').length || 0}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by employee..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filtered?.length ? (
              <p className="text-center text-muted-foreground py-8">No leave requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      {role === 'admin' && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.employees?.full_name}</td>
                        <td>
                          <Badge variant="secondary" className="capitalize">
                            {LEAVE_TYPES.find((t) => t.value === r.leave_type)?.label || r.leave_type}
                          </Badge>
                        </td>
                        <td className="text-sm">
                          {new Date(r.start_date).toLocaleDateString()} — {new Date(r.end_date).toLocaleDateString()}
                        </td>
                        <td className="font-semibold">{getDays(r.start_date, r.end_date)}</td>
                        <td className="text-sm text-muted-foreground max-w-[200px] truncate">{r.reason || '—'}</td>
                        <td>
                          <Badge className={
                            r.status === 'approved' ? 'bg-success/20 text-success border-0' :
                            r.status === 'rejected' ? 'bg-destructive/20 text-destructive border-0' :
                            'bg-warning/20 text-warning border-0'
                          }>{r.status}</Badge>
                        </td>
                        {role === 'admin' && (
                          <td>
                            {r.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'approved' })}>
                                  <CheckCircle className="w-3 h-3 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'rejected' })}>
                                  <XCircle className="w-3 h-3 mr-1" />Reject
                                </Button>
                              </div>
                            )}
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
