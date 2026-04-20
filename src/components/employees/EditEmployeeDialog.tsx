import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  employee: any | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (employee) setForm({ ...employee });
  }, [employee]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('employees').update({
        phone: form.phone || null,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        nssf_number: form.nssf_number || null,
        tin_number: form.tin_number || null,
        salary: parseFloat(form.salary) || 0,
        status: form.status || 'active',
        job_title: form.job_title,
        department: (form.department || 'general').toLowerCase(),
      }).eq('id', employee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Updated', description: 'Employee record updated.' });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>{employee.full_name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="grid grid-cols-2 gap-3 mt-2">
          <div className="space-y-1 col-span-2">
            <Label>Job Title</Label>
            <Input value={form.job_title || ''} onChange={(e) => set('job_title', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Salary (UGX)</Label>
            <Input type="number" value={form.salary || 0} onChange={(e) => set('salary', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Bank Name</Label>
            <Input value={form.bank_name || ''} onChange={(e) => set('bank_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Bank Account</Label>
            <Input value={form.bank_account || ''} onChange={(e) => set('bank_account', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>NSSF Number</Label>
            <Input value={form.nssf_number || ''} onChange={(e) => set('nssf_number', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>TIN Number</Label>
            <Input value={form.tin_number || ''} onChange={(e) => set('tin_number', e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Status</Label>
            <Select value={form.status || 'active'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
