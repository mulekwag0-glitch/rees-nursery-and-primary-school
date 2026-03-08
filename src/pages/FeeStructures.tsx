import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, DollarSign } from 'lucide-react';

export default function FeeStructures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ program_id: '', semester_id: '', tuition_fee: '', other_fees: '' });

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

  const { data: feeStructures, isLoading } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_structures')
        .select(`
          id, tuition_fee, other_fees, total_fee,
          programs:program_id (name, code),
          semesters:semester_id (name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const tuition = parseFloat(data.tuition_fee) || 0;
      const other = parseFloat(data.other_fees) || 0;
      const payload = {
        program_id: data.program_id,
        semester_id: data.semester_id,
        tuition_fee: tuition,
        other_fees: other,
      };
      if (editingId) {
        const { error } = await supabase.from('fee_structures').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fee_structures').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast({ title: 'Success', description: editingId ? 'Fee structure updated' : 'Fee structure created' });
      resetForm();
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast({ title: 'Success', description: 'Fee structure deleted' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ program_id: '', semester_id: '', tuition_fee: '', other_fees: '' });
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleEdit = (fee: any) => {
    setEditingId(fee.id);
    setFormData({
      program_id: fee.program_id || '',
      semester_id: fee.semester_id || '',
      tuition_fee: fee.tuition_fee?.toString() || '',
      other_fees: fee.other_fees?.toString() || '',
    });
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fee Structures</h1>
            <p className="text-muted-foreground">Set tuition fees per program and semester</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Fee Structure</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Fee Structure</DialogTitle>
                <DialogDescription>Set tuition and other fees for a program and semester</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Program</Label>
                  <Select value={formData.program_id} onValueChange={(v) => setFormData({ ...formData, program_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {programs?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Semester</Label>
                  <Select value={formData.semester_id} onValueChange={(v) => setFormData({ ...formData, semester_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      {semesters?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tuition Fee (UGX)</Label>
                  <Input type="number" value={formData.tuition_fee} onChange={(e) => setFormData({ ...formData, tuition_fee: e.target.value })} placeholder="e.g. 1500000" />
                </div>
                <div>
                  <Label>Other Fees (UGX)</Label>
                  <Input type="number" value={formData.other_fees} onChange={(e) => setFormData({ ...formData, other_fees: e.target.value })} placeholder="e.g. 250000" />
                </div>
                {formData.tuition_fee && (
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="font-semibold">{formatCurrency((parseFloat(formData.tuition_fee) || 0) + (parseFloat(formData.other_fees) || 0))}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending || !formData.program_id || !formData.semester_id}>
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : feeStructures?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No fee structures defined yet. Click "Add Fee Structure" to get started.
            </div>
          ) : (
            feeStructures?.map((fee: any) => (
              <Card key={fee.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{(fee.programs as any)?.code}</CardTitle>
                      <CardDescription>{(fee.programs as any)?.name}</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">{(fee.semesters as any)?.name}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tuition</span>
                      <span className="font-medium">{formatCurrency(fee.tuition_fee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Other Fees</span>
                      <span className="font-medium">{formatCurrency(fee.other_fees)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">{formatCurrency(fee.total_fee)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(fee)}>
                      <Pencil className="w-3 h-3 mr-1" />Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(fee.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
