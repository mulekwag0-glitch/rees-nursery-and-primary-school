import React, { useState, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentFormModal } from '@/components/payments/PaymentFormModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarIcon,
  CreditCard,
  Search,
  Download,
  Receipt,
  Wallet,
  TrendingUp,
  Loader2,
  Printer,
  Filter,
  X,
  Check,
  Tag,
  Edit,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function printReceipt(payment: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html><head><title>Receipt ${payment.receipt_number}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 400px; margin: 0 auto; }
      .header { text-align: center; margin-bottom: 24px; }
      .logo { font-size: 22px; font-weight: bold; color: #1e3a5f; }
      .sub { font-size: 11px; color: #666; }
      .title { font-size: 16px; font-weight: 600; margin-top: 8px; letter-spacing: 2px; }
      .divider { border-top: 2px dashed #ccc; margin: 16px 0; }
      .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
      .row .label { color: #666; }
      .row .value { font-weight: 500; }
      .amount { text-align: center; margin: 20px 0; }
      .amount .val { font-size: 28px; font-weight: bold; color: #16a34a; }
      .footer { text-align: center; font-size: 10px; color: #999; margin-top: 24px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
      <div class="header">
        <div class="logo">Rees Daycare Nursery & Primary School</div>
        <div class="sub">Mbale City, Uganda · Tel: 0772379888 / 0706583860 / 0782063563</div>
        <div class="sub">Email: reesnursery@gmail.com</div>
        <div class="title">PAYMENT RECEIPT</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span class="label">Receipt No:</span><span class="value">${payment.receipt_number}</span></div>
      <div class="row"><span class="label">Date:</span><span class="value">${new Date(payment.payment_date).toLocaleDateString()}</span></div>
      <div class="row"><span class="label">Pupil ID:</span><span class="value">${payment.students?.student_id || '-'}</span></div>
      <div class="row"><span class="label">Name:</span><span class="value">${payment.students?.full_name || payment.students?.profiles?.full_name || '-'}</span></div>
      <div class="row"><span class="label">Class:</span><span class="value">${payment.students?.programs?.name || '-'}</span></div>
      <div class="row"><span class="label">Term:</span><span class="value">${payment.semesters?.name || '-'}</span></div>
      <div class="row"><span class="label">Method:</span><span class="value" style="text-transform:capitalize">${(payment.payment_method || '').replace('_', ' ')}</span></div>
      ${payment.notes ? `<div class="row"><span class="label">Notes:</span><span class="value">${payment.notes}</span></div>` : ''}
      <div class="divider"></div>
      <div class="amount">
        <div style="font-size:12px;color:#666">Amount Paid</div>
        <div class="val">UGX ${parseFloat(payment.amount).toLocaleString()}</div>
      </div>
      ${payment.balance_info ? `
      <div class="row"><span class="label">Term Fee:</span><span class="value">UGX ${payment.balance_info.fee.toLocaleString()}</span></div>
      <div class="row"><span class="label">Total Paid:</span><span class="value">UGX ${payment.balance_info.paid.toLocaleString()}</span></div>
      <div class="row"><span class="label" style="color:#b91c1c;font-weight:600">Balance Due:</span><span class="value" style="color:#b91c1c;font-weight:600">UGX ${payment.balance_info.balance.toLocaleString()}</span></div>
      ` : ''}
      <div class="divider"></div>
      <div class="footer"><p>Thank you for your payment</p><p>This is a computer-generated receipt</p></div>
    </body></html>
  `);
  w.document.close();
  w.print();
}

function FinancePaymentsView() {
  const { can } = useModuleAccess();
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'finance' || can('payments', 'edit');
  const isAdmin = role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [discountFilter, setDiscountFilter] = useState<'all' | 'discounted'>('all');
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
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

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ['all-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          students:student_id (
            student_id,
            full_name,
            program_id,
            programs:program_id (name, code),
            profiles:user_id (full_name)
          ),
          semesters:semester_id (name)
        `)
        .order('payment_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  // Fee structures + per-student totals to compute balance
  const { data: feeStructures } = useQuery({
    queryKey: ['all-fee-structures'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_structures').select('program_id, semester_id, total_fee');
      return data || [];
    },
  });

  const { data: paymentTotals } = useQuery({
    queryKey: ['payment-totals-by-student-term'],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('student_id, semester_id, amount');
      const map: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const key = `${p.student_id}|${p.semester_id}`;
        map[key] = (map[key] || 0) + Number(p.amount || 0);
      });
      return map;
    },
  });

  const { data: discounts, refetch: refetchDiscounts } = useQuery({
    queryKey: ['pupil-discounts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pupil_discounts')
        .select(`*, students:student_id (student_id, full_name, programs:program_id (name)), semesters:semester_id (name)`)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const discountedStudentIds = useMemo(() => {
    const set = new Set<string>();
    (discounts || []).forEach((d: any) => { if (d.status === 'approved') set.add(d.student_id); });
    return set;
  }, [discounts]);

  const updateDiscountStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('pupil_discounts').update({
      status, approved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `Discount ${status}` });
      refetchDiscounts();
      qc.invalidateQueries({ queryKey: ['all-payments'] });
    }
  };

  const approvePayment = async (id: string) => {
    const { error } = await supabase.from('payments').update({
      status: 'approved',
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Payment approved & locked' });
    refetch();
  };

  const rejectPayment = async (id: string) => {
    const reason = window.prompt('Reason for rejecting this payment?');
    if (!reason) return;
    const { error } = await supabase.from('payments').update({
      status: 'rejected',
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approved_at: new Date().toISOString(),
      notes: reason,
    }).eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Payment rejected' });
    refetch();
  };

  const pendingPayments = (payments || []).filter((p: any) => p.status !== 'approved' && p.status !== 'rejected');
  const approvalHistory = (payments || []).filter((p: any) => p.status === 'approved' || p.status === 'rejected');

  const saveEdit = async () => {
    if (!editTarget) return;
    const { error } = await supabase.from('payments').update({
      amount: parseFloat(editTarget.amount) || 0,
      payment_method: editTarget.payment_method,
      notes: editTarget.notes || null,
      payment_date: editTarget.payment_date,
    }).eq('id', editTarget.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Payment updated' });
    setEditTarget(null);
    refetch();
  };

  const getBalance = (payment: any) => {
    const fee = feeStructures?.find(
      (f: any) => f.program_id === payment.students?.program_id && f.semester_id === payment.semester_id
    );
    if (!fee) return null;
    const paid = paymentTotals?.[`${payment.student_id}|${payment.semester_id}`] || 0;
    const total = Number(fee.total_fee || 0);
    return { fee: total, paid, balance: total - paid };
  };

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const { data: todayPayments } = await supabase.from('payments').select('amount').gte('payment_date', today);
      const { data: monthPayments } = await supabase.from('payments').select('amount').gte('payment_date', monthStart);
      const { data: allPayments } = await supabase.from('payments').select('amount');

      return {
        today: todayPayments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
        month: monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
        total: allPayments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
        count: allPayments?.length || 0,
      };
    },
  });

  const hasActiveFilters = methodFilter !== 'all' || semesterFilter !== 'all' || programFilter !== 'all' || !!dateFrom || !!dateTo || discountFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setMethodFilter('all');
    setSemesterFilter('all');
    setProgramFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setDiscountFilter('all');
  };

  const filteredPayments = payments?.filter((p: any) => {
    const matchesSearch =
      !searchTerm ||
      p.students?.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.students?.full_name || p.students?.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || p.payment_method === methodFilter;
    const matchesSemester = semesterFilter === 'all' || p.semester_id === semesterFilter;
    const matchesProgram = programFilter === 'all' || p.students?.program_id === programFilter;
    const paymentDate = new Date(p.payment_date);
    const matchesDateFrom = !dateFrom || paymentDate >= dateFrom;
    const matchesDateTo = !dateTo || paymentDate <= dateTo;
    const matchesDiscount = discountFilter === 'all' || discountedStudentIds.has(p.student_id);
    return matchesSearch && matchesMethod && matchesSemester && matchesProgram && matchesDateFrom && matchesDateTo && matchesDiscount;
  });

  const exportCSV = () => {
    if (!filteredPayments?.length) return;
    const headers = 'Date,Student ID,Name,Amount,Method,Receipt,Semester\n';
    const rows = filteredPayments.map((p: any) =>
      `${p.payment_date},${p.students?.student_id},${p.students?.full_name},${p.amount},${p.payment_method},${p.receipt_number},${p.semesters?.name}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-success text-success-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Today's Collection</p>
                <p className="text-2xl font-bold">UGX {(stats?.today || 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">This Month</p>
                <p className="text-2xl font-bold">UGX {(stats?.month || 0).toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary text-secondary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Collected</p>
                <p className="text-2xl font-bold">UGX {(stats?.total || 0).toLocaleString()}</p>
              </div>
              <CreditCard className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning text-warning-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Transactions</p>
                <p className="text-2xl font-bold">{stats?.count || 0}</p>
              </div>
              <Receipt className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student ID, name, or receipt..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {canEdit && <PaymentFormModal onSuccess={refetch} />}
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {semesters?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {programs?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={discountFilter} onValueChange={(v: any) => setDiscountFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pupils</SelectItem>
                <SelectItem value="discounted">Discounted Pupils Only</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-2">
            Approvals
            {pendingPayments.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{pendingPayments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4 space-y-6">
      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Transactions</CardTitle>
          <CardDescription>
            Showing {filteredPayments?.length || 0} of {payments?.length || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : !filteredPayments?.length ? (
            <p className="text-center text-muted-foreground py-8">No payments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pupil ID</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Term</th>
                    <th>Amount</th>
                    <th>Balance</th>
                    <th>Method</th>
                    <th>Receipt</th>
                    <th>Status</th>
                    {canEdit && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment: any) => {
                    const bal = getBalance(payment);
                    const name = payment.students?.full_name || payment.students?.profiles?.full_name || '-';
                    const isApproved = payment.status === 'approved';
                    return (
                    <tr key={payment.id}>
                      <td className="text-sm">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="font-mono text-sm">{payment.students?.student_id}</td>
                      <td className="font-medium">{name}</td>
                      <td className="text-sm">{payment.students?.programs?.name || '-'}</td>
                      <td className="text-sm">{payment.semesters?.name}</td>
                      <td className="font-semibold text-success">
                        UGX {parseFloat(payment.amount).toLocaleString()}
                      </td>
                      <td className={`text-sm font-medium ${bal && bal.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                        {bal ? `UGX ${bal.balance.toLocaleString()}` : '—'}
                      </td>
                      <td>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {payment.payment_method?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs">{payment.receipt_number}</td>
                      <td>
                        {isApproved ? (
                          <Badge className="bg-success/20 text-success border-0 gap-1"><Lock className="w-3 h-3" />Approved</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-warning/20 text-warning border-0">Pending</Badge>
                        )}
                      </td>
                      {canEdit && (
                        <td className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => printReceipt({ ...payment, balance_info: bal })} title="Print">
                              <Printer className="w-4 h-4" />
                            </Button>
                            {!isApproved && (
                              <Button variant="ghost" size="sm" onClick={() => setEditTarget({ ...payment })} title="Edit">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {!isApproved && isAdmin && (
                              <Button variant="ghost" size="sm" onClick={() => approvePayment(payment.id)} title="Approve & lock">
                                <CheckCircle className="w-4 h-4 text-success" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="w-4 h-4" />Pending Payment Approvals</CardTitle>
              <CardDescription>{pendingPayments.length} awaiting approval — admin only</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nothing pending — all payments are approved</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Pupil</th><th>Class</th><th>Term</th><th>Amount</th><th>Method</th><th>Receipt</th><th>Recorded by</th>{isAdmin && <th className="text-right">Actions</th>}</tr></thead>
                    <tbody>
                      {pendingPayments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="font-medium">{p.students?.full_name || p.students?.student_id || '-'}</td>
                          <td className="text-sm">{p.students?.programs?.name || '-'}</td>
                          <td className="text-sm">{p.semesters?.name}</td>
                          <td className="font-semibold text-success">UGX {parseFloat(p.amount).toLocaleString()}</td>
                          <td><Badge variant="secondary" className="capitalize text-xs">{p.payment_method?.replace('_',' ')}</Badge></td>
                          <td className="font-mono text-xs">{p.receipt_number}</td>
                          <td className="text-xs text-muted-foreground">{p.recorded_by?.slice(0,8) || '-'}</td>
                          {isAdmin && (
                            <td className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => approvePayment(p.id)} title="Approve & lock">
                                  <Check className="w-4 h-4 text-success" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => rejectPayment(p.id)} title="Reject">
                                  <X className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approval History</CardTitle>
              <CardDescription>Last {approvalHistory.length} reviewed payments</CardDescription>
            </CardHeader>
            <CardContent>
              {approvalHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No approvals yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Approved/Rejected at</th><th>Pupil</th><th>Amount</th><th>Receipt</th><th>Status</th></tr></thead>
                    <tbody>
                      {approvalHistory.map((p: any) => (
                        <tr key={p.id}>
                          <td className="text-sm">{p.approved_at ? new Date(p.approved_at).toLocaleString() : '-'}</td>
                          <td className="font-medium">{p.students?.full_name || p.students?.student_id}</td>
                          <td className="font-semibold">UGX {parseFloat(p.amount).toLocaleString()}</td>
                          <td className="font-mono text-xs">{p.receipt_number}</td>
                          <td>
                            {p.status === 'approved' ? (
                              <Badge className="bg-success/20 text-success border-0 gap-1"><Lock className="w-3 h-3" />Approved</Badge>
                            ) : (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4 space-y-6">
      {/* Discounts Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><Tag className="w-4 h-4" /> Pupil Discounts</CardTitle>
              <CardDescription>Approve or reject discount requests</CardDescription>
            </div>
            <Badge variant="secondary">{discounts?.length || 0} requests</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!discounts?.length ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No discount requests yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Pupil</th>
                    <th>Class</th>
                    <th>Term</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d: any) => (
                    <tr key={d.id}>
                      <td className="text-sm">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="font-medium">{d.students?.full_name || d.students?.student_id}</td>
                      <td className="text-sm">{d.students?.programs?.name || '-'}</td>
                      <td className="text-sm">{d.semesters?.name}</td>
                      <td className="font-semibold">UGX {Number(d.amount).toLocaleString()}</td>
                      <td className="text-sm text-muted-foreground">{d.reason || '-'}</td>
                      <td>
                        <Badge
                          variant={d.status === 'approved' ? 'default' : d.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="text-right">
                        {d.status === 'pending' && (role === 'admin') && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => updateDiscountStatus(d.id, 'approved')} title="Approve">
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateDiscountStatus(d.id, 'rejected')} title="Reject">
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Edit payment (only while pending) */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>Update payment details. Changes are allowed while the payment is pending — once approved, it locks.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Pupil</Label>
                <Input
                  value={`${editTarget.students?.full_name || editTarget.students?.profiles?.full_name || '-'} · ${editTarget.students?.student_id || ''}`}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Term</Label>
                <Input value={editTarget.semesters?.name || '-'} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input type="number" min={0} value={editTarget.amount}
                  onChange={(e) => setEditTarget({ ...editTarget, amount: e.target.value })}
                  placeholder="Enter amount" required />
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input type="date" value={(editTarget.payment_date || '').split('T')[0]}
                  onChange={(e) => setEditTarget({ ...editTarget, payment_date: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={editTarget.payment_method} onValueChange={(v) => setEditTarget({ ...editTarget, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Receipt Number</Label>
                <Input value={editTarget.receipt_number || ''} disabled className="bg-muted font-mono" />
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea rows={2} value={editTarget.notes || ''}
                  onChange={(e) => setEditTarget({ ...editTarget, notes: e.target.value })}
                  placeholder="Additional notes..." />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentPaymentsView() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-payments', user?.id],
    queryFn: async () => {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`id, program_id, programs:program_id (name)`)
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (studentError || !student) return null;

      const { data: payments } = await supabase
        .from('payments')
        .select(`*, semesters:semester_id (name)`)
        .eq('student_id', student.id)
        .order('payment_date', { ascending: false });

      const { data: feeStructures } = await supabase
        .from('fee_structures')
        .select('total_fee')
        .eq('program_id', student.program_id);

      const totalFee = feeStructures?.reduce((sum, f) => sum + parseFloat(f.total_fee as any || '0'), 0) || 0;
      const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0;
      const balance = totalFee - totalPaid;
      const percentage = totalFee > 0 ? Math.min(100, (totalPaid / totalFee) * 100) : 0;

      const semesters = [...new Set(payments?.map((p: any) => JSON.stringify({ id: p.semester_id, name: p.semesters?.name })))].map(s => JSON.parse(s));

      return { payments, totalFee, totalPaid, balance, percentage, semesters };
    },
    enabled: !!user?.id,
  });

  const filteredPayments = studentData?.payments?.filter((p: any) => {
    const matchesSearch = !searchTerm ||
      p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.semesters?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = semesterFilter === 'all' || p.semester_id === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm opacity-80">Total Fees</p>
              <p className="text-2xl font-bold">UGX {(studentData?.totalFee || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Amount Paid</p>
              <p className="text-2xl font-bold">UGX {(studentData?.totalPaid || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Balance Due</p>
              <p className="text-2xl font-bold">UGX {(studentData?.balance || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Payment Progress</span>
              <span>{Math.round(studentData?.percentage || 0)}%</span>
            </div>
            <Progress value={studentData?.percentage || 0} className="h-2 bg-primary-foreground/20" />
          </div>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by receipt or semester..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {studentData?.semesters?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>Showing {filteredPayments?.length || 0} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments?.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">UGX {parseFloat(payment.amount).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString()} • {payment.semesters?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="capitalize">{payment.payment_method?.replace('_', ' ')}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{payment.receipt_number}</p>
                </div>
              </div>
            ))}
            {!filteredPayments?.length && (
              <p className="text-center text-muted-foreground py-8">No payments found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Payments() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">
            {role === 'student' ? 'View your payment history and balance' : 'Manage student payments and fees'}
          </p>
        </div>
        {(role === 'finance' || role === 'admin') && <FinancePaymentsView />}
        {role === 'student' && <StudentPaymentsView />}
      </div>
    </DashboardLayout>
  );
}
