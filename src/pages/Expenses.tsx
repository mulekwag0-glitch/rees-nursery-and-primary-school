import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Search, Loader2, Receipt, TrendingDown, CheckCircle, Clock, Trash2, Download, Upload, Edit } from 'lucide-react';
import { expenseSchema, validateForm, sanitizeCsvValue } from '@/lib/validation';
import { EXPENSE_IMPORT } from '@/lib/expensesImportData';
import { useModuleAccess } from '@/hooks/useModuleAccess';

const CATEGORIES = [
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'supplies', label: 'Office Supplies' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'transport', label: 'Transport' },
  { value: 'events', label: 'Events & Activities' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'general', label: 'General' },
];

export default function Expenses() {
  const { toast } = useToast();
  const { user, role } = useAuth();
  const { can } = useModuleAccess();
  const canEdit = can('expenses', 'edit', role === 'admin' || role === 'finance' ? 'full' : 'view');
  const canFull = can('expenses', 'full', role === 'admin' ? 'full' : 'none');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptRef, setReceiptRef] = useState('');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for recorded_by display
  const { data: profiles } = useQuery({
    queryKey: ['expense-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) throw error;
      return data;
    },
  });

  const profileMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    profiles?.forEach((p) => { map[p.id] = p.full_name; });
    return map;
  }, [profiles]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const v = validateForm(expenseSchema, {
        title, description, amount: parseFloat(amount) || 0, category, expenseDate, receiptRef,
      });
      const { data, error } = await supabase.from('expenses').insert({
        title: v.title,
        description: v.description || null,
        amount: v.amount,
        category: v.category,
        expense_date: v.expenseDate,
        receipt_reference: v.receiptRef || null,
        recorded_by: user.id,
      }).select().single();
      if (error) throw error;
      await logAudit('expense_created', 'expenses', data.id, null, { title, amount: parseFloat(amount), category });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense Recorded', description: 'Expense has been added successfully.' });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'approved', approved_by: user?.id })
        .eq('id', expenseId);
      if (error) throw error;
      await logAudit('expense_approved', 'expenses', expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Approved', description: 'Expense approved successfully.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      await logAudit('expense_deleted', 'expenses', expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Deleted', description: 'Expense removed.' });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const { error } = await supabase.from('expenses').update({
        title: editTarget.title,
        description: editTarget.description || null,
        amount: parseFloat(editTarget.amount) || 0,
        category: editTarget.category,
        expense_date: editTarget.expense_date,
        receipt_reference: editTarget.receipt_reference || null,
      }).eq('id', editTarget.id);
      if (error) throw error;
      await logAudit('expense_updated', 'expenses', editTarget.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Updated', description: 'Expense updated successfully.' });
      setEditTarget(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: existing } = await supabase.from('expenses').select('title, expense_date, amount');
      const seen = new Set((existing || []).map((e: any) => `${e.expense_date}|${e.title}|${e.amount}`));
      const rows = EXPENSE_IMPORT
        .filter(e => !seen.has(`${e.date}|${e.title}|${e.amount}`))
        .map(e => ({
          title: e.title,
          description: e.description || null,
          amount: e.amount,
          category: e.category,
          expense_date: e.date,
          receipt_reference: e.receipt_ref || null,
          recorded_by: user.id,
          status: 'approved',
        }));
      if (rows.length === 0) return { inserted: 0, skipped: EXPENSE_IMPORT.length };
      const { error } = await supabase.from('expenses').insert(rows);
      if (error) throw error;
      return { inserted: rows.length, skipped: EXPENSE_IMPORT.length - rows.length };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Import complete', description: `${r.inserted} added, ${r.skipped} already existed.` });
    },
    onError: (e: any) => toast({ title: 'Import failed', description: e.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setCategory('general');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setReceiptRef('');
    setOpen(false);
  };

  const filtered = expenses?.filter((e: any) => {
    const matchesSearch = e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.receipt_reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const d = e.expense_date;
    const matchesFrom = !dateFrom || d >= dateFrom;
    const matchesTo = !dateTo || d <= dateTo;
    return matchesSearch && matchesCat && matchesStatus && matchesFrom && matchesTo;
  });

  const totalExpenses = expenses?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0;
  const pendingTotal = expenses?.filter((e: any) => e.status === 'pending').reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0) || 0;
  const approvedTotal = expenses?.filter((e: any) => e.status === 'approved').reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0) || 0;
  const thisMonthTotal = expenses?.filter((e: any) => {
    const d = new Date(e.expense_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0) || 0;

  const formatUGX = (val: number) => `UGX ${val.toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground">Track and manage institutional expenditure</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              if (!filtered?.length) return;
              const headers = ['Date', 'Title', 'Category', 'Amount', 'Receipt Ref', 'Status', 'Recorded By'];
              const rows = filtered.map((e: any) => [
                sanitizeCsvValue(new Date(e.expense_date).toLocaleDateString()),
                sanitizeCsvValue(e.title),
                sanitizeCsvValue(CATEGORIES.find(c => c.value === e.category)?.label || e.category),
                sanitizeCsvValue(parseFloat(e.amount)),
                sanitizeCsvValue(e.receipt_reference),
                sanitizeCsvValue(e.status),
                sanitizeCsvValue(profileMap[e.recorded_by] || 'Unknown'),
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}>
              <Download className="w-4 h-4 mr-2" />Export CSV
            </Button>
            {canFull && (
              <Button variant="outline" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
                {importMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import Expenses
              </Button>
            )}
            {canEdit && (
            <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Record Expense</Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>Enter details for the expenditure</DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office stationery purchase" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (UGX) *</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Ref</Label>
                    <Input value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || !title || !amount}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Expense
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <TrendingDown className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <p className="text-xl font-bold">{formatUGX(totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Receipt className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{formatUGX(thisMonthTotal)}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-warning" />
              <p className="text-xl font-bold">{formatUGX(pendingTotal)}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
              <p className="text-xl font-bold">{formatUGX(approvedTotal)}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by title or receipt ref..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" placeholder="From" title="From date" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" placeholder="To" title="To date" />
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filtered?.length ? (
              <p className="text-center text-muted-foreground py-8">No expenses found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Recorded By</th>
                      <th>Status</th>
                      {canEdit && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any) => (
                      <tr key={e.id}>
                        <td className="text-sm">{new Date(e.expense_date).toLocaleDateString()}</td>
                        <td>
                          <div className="font-medium">{e.title}</div>
                          {e.receipt_reference && <span className="text-xs text-muted-foreground font-mono">{e.receipt_reference}</span>}
                        </td>
                        <td>
                          <Badge variant="secondary" className="capitalize">
                            {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                          </Badge>
                        </td>
                        <td className="font-semibold">{formatUGX(parseFloat(e.amount))}</td>
                        <td className="text-sm text-muted-foreground">{profileMap[e.recorded_by] || 'Unknown'}</td>
                        <td>
                          <Badge variant={e.status === 'approved' ? 'default' : 'secondary'}
                            className={e.status === 'approved' ? 'bg-success/20 text-success border-0' : 'bg-warning/20 text-warning border-0'}>
                            {e.status}
                          </Badge>
                        </td>
                        {canEdit && (
                          <td>
                            <div className="flex gap-1">
                              {e.status === 'pending' && canFull && (
                                <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(e.id)}
                                  disabled={approveMutation.isPending}>
                                  <CheckCircle className="w-3 h-3 mr-1" />Approve
                                </Button>
                              )}
                              {/* Locked once approved (only admin can override) */}
                              {(e.status !== 'approved' || role === 'admin') && (
                                <Button size="sm" variant="ghost" onClick={() => setEditTarget({ ...e })}
                                  title={e.status === 'approved' ? 'Approved (admin override)' : 'Edit'}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                              {canFull && e.status !== 'approved' && (
                                <Button size="sm" variant="ghost" className="text-destructive"
                                  onClick={() => deleteMutation.mutate(e.id)} disabled={deleteMutation.isPending}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
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

        {/* Edit Expense Dialog */}
        <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>Update expense details</DialogDescription>
            </DialogHeader>
            {editTarget && (
              <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={editTarget.title || ''} onChange={(e) => setEditTarget({ ...editTarget, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (UGX)</Label>
                    <Input type="number" value={editTarget.amount || 0} onChange={(e) => setEditTarget({ ...editTarget, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={editTarget.category || 'general'} onValueChange={(v) => setEditTarget({ ...editTarget, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={editTarget.expense_date || ''} onChange={(e) => setEditTarget({ ...editTarget, expense_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Ref</Label>
                    <Input value={editTarget.receipt_reference || ''} onChange={(e) => setEditTarget({ ...editTarget, receipt_reference: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editTarget.description || ''} onChange={(e) => setEditTarget({ ...editTarget, description: e.target.value })} rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                  <Button type="submit" disabled={editMutation.isPending}>
                    {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
