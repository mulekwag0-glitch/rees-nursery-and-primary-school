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
import { logAudit } from '@/lib/audit';
import { Plus, Loader2, CheckCircle, DollarSign, TrendingDown, Search, Printer } from 'lucide-react';

export default function Payroll() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [payPeriod, setPayPeriod] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('0');
  const [nssfDeduction, setNssfDeduction] = useState('0');
  const [payeTax, setPayeTax] = useState('0');
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['payroll-employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, full_name, salary, department').eq('status', 'active').order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ['payroll-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*, employees:employee_id (full_name, department)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('payroll_records').insert({
        employee_id: employeeId,
        pay_period: payPeriod,
        basic_salary: parseFloat(basicSalary) || 0,
        allowances: parseFloat(allowances) || 0,
        nssf_deduction: parseFloat(nssfDeduction) || 0,
        paye_tax: parseFloat(payeTax) || 0,
        other_deductions: parseFloat(otherDeductions) || 0,
        notes: notes || null,
      }).select().single();
      if (error) throw error;
      await logAudit('payroll_created', 'payroll_records', data.id, null, { employee_id: employeeId, pay_period: payPeriod });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({ title: 'Payroll Created', description: 'Payroll record added successfully.' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payroll_records')
        .update({ status: 'approved', processed_by: user?.id, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await logAudit('payroll_approved', 'payroll_records', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
      toast({ title: 'Approved', description: 'Payroll approved for payment.' });
    },
  });

  const resetForm = () => {
    setEmployeeId(''); setPayPeriod(''); setBasicSalary(''); setAllowances('0');
    setNssfDeduction('0'); setPayeTax('0'); setOtherDeductions('0'); setNotes('');
    setOpen(false);
  };

  const printPayslip = (record: any) => {
    const emp = record.employees;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${emp?.full_name}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:40px;color:#222}
        h1{font-size:20px;margin-bottom:4px}
        .sub{color:#666;font-size:13px;margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #ddd}
        th{background:#f5f5f5;font-weight:600}
        .total{font-weight:700;font-size:16px}
        .footer{margin-top:40px;font-size:12px;color:#999;border-top:1px solid #ddd;padding-top:12px}
        @media print{body{margin:20px}}
      </style>
    </head><body>
      <h1>Salem SIMS — Payslip</h1>
      <p class="sub">Pay Period: ${record.pay_period} | Status: ${record.status}</p>
      <table>
        <tr><th>Employee</th><td>${emp?.full_name || '—'}</td></tr>
        <tr><th>Department</th><td style="text-transform:capitalize">${emp?.department || '—'}</td></tr>
      </table>
      <table>
        <tr><th colspan="2" style="background:#e8f5e9">Earnings</th></tr>
        <tr><td>Basic Salary</td><td>UGX ${parseFloat(record.basic_salary).toLocaleString()}</td></tr>
        <tr><td>Allowances</td><td>UGX ${parseFloat(record.allowances).toLocaleString()}</td></tr>
        <tr><td class="total">Gross Pay</td><td class="total">UGX ${(parseFloat(record.basic_salary) + parseFloat(record.allowances)).toLocaleString()}</td></tr>
      </table>
      <table>
        <tr><th colspan="2" style="background:#ffebee">Deductions</th></tr>
        <tr><td>NSSF</td><td>UGX ${parseFloat(record.nssf_deduction).toLocaleString()}</td></tr>
        <tr><td>PAYE Tax</td><td>UGX ${parseFloat(record.paye_tax).toLocaleString()}</td></tr>
        <tr><td>Other Deductions</td><td>UGX ${parseFloat(record.other_deductions).toLocaleString()}</td></tr>
        <tr><td class="total">Total Deductions</td><td class="total">UGX ${(parseFloat(record.nssf_deduction) + parseFloat(record.paye_tax) + parseFloat(record.other_deductions)).toLocaleString()}</td></tr>
      </table>
      <table>
        <tr><td class="total" style="font-size:18px">Net Pay</td><td class="total" style="font-size:18px">UGX ${parseFloat(record.net_pay).toLocaleString()}</td></tr>
      </table>
      <div class="footer">Generated on ${new Date().toLocaleDateString()} — Salem Student Information Management System</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const handleEmployeeSelect = (id: string) => {
    setEmployeeId(id);
    const emp = employees?.find((e: any) => e.id === id);
    if (emp) setBasicSalary(String(emp.salary));
  };

  const filtered = records?.filter((r: any) =>
    r.employees?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.pay_period?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNet = records?.reduce((s: number, r: any) => s + parseFloat(r.net_pay || 0), 0) || 0;
  const approvedNet = records?.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + parseFloat(r.net_pay || 0), 0) || 0;
  const fmt = (v: number) => `UGX ${v.toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
            <p className="text-muted-foreground">Process salaries, deductions, and allowances</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Payroll</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Payroll Record</DialogTitle>
                <DialogDescription>Process salary for an employee</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Select value={employeeId} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.department}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pay Period * (e.g. March 2026)</Label>
                  <Input value={payPeriod} onChange={(e) => setPayPeriod(e.target.value)} placeholder="March 2026" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Basic Salary (UGX)</Label>
                    <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowances</Label>
                    <Input type="number" value={allowances} onChange={(e) => setAllowances(e.target.value)} min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>NSSF Deduction</Label>
                    <Input type="number" value={nssfDeduction} onChange={(e) => setNssfDeduction(e.target.value)} min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>PAYE Tax</Label>
                    <Input type="number" value={payeTax} onChange={(e) => setPayeTax(e.target.value)} min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Deductions</Label>
                    <Input type="number" value={otherDeductions} onChange={(e) => setOtherDeductions(e.target.value)} min="0" />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium">Estimated Net Pay: <span className="text-primary">
                    {fmt((parseFloat(basicSalary) || 0) + (parseFloat(allowances) || 0) - (parseFloat(nssfDeduction) || 0) - (parseFloat(payeTax) || 0) - (parseFloat(otherDeductions) || 0))}
                  </span></p>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || !employeeId || !payPeriod}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Payroll
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{fmt(totalNet)}</p>
              <p className="text-xs text-muted-foreground">Total Net Pay</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
              <p className="text-xl font-bold">{fmt(approvedNet)}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold">{records?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or period..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filtered?.length ? (
              <p className="text-center text-muted-foreground py-8">No payroll records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Period</th>
                      <th>Basic</th>
                      <th>Allowances</th>
                      <th>Deductions</th>
                      <th>Net Pay</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r: any) => (
                      <tr key={r.id}>
                        <td>
                          <div className="font-medium">{r.employees?.full_name}</div>
                          <span className="text-xs text-muted-foreground capitalize">{r.employees?.department}</span>
                        </td>
                        <td>{r.pay_period}</td>
                        <td>{fmt(parseFloat(r.basic_salary))}</td>
                        <td>{fmt(parseFloat(r.allowances))}</td>
                        <td className="text-destructive">
                          {fmt(parseFloat(r.nssf_deduction) + parseFloat(r.paye_tax) + parseFloat(r.other_deductions))}
                        </td>
                        <td className="font-semibold">{fmt(parseFloat(r.net_pay))}</td>
                        <td>
                          <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}
                            className={r.status === 'approved' ? 'bg-success/20 text-success border-0' : 'bg-warning/20 text-warning border-0'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {r.status === 'draft' && role === 'admin' && (
                              <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(r.id)}>
                                <CheckCircle className="w-3 h-3 mr-1" />Approve
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => printPayslip(r)}>
                              <Printer className="w-3 h-3" />
                            </Button>
                          </div>
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
