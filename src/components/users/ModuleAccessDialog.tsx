import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const MODULES = [
  { key: 'pupils', label: 'Pupils & Admissions' },
  { key: 'results', label: 'Results & Report Cards' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'lesson_plans', label: 'Lesson Plans / Schemes' },
  { key: 'timetable', label: 'Timetables' },
  { key: 'finance', label: 'Payments & Fees' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'hr', label: 'HR / Employees' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'settings', label: 'System Settings' },
  { key: 'users', label: 'User Management' },
];

const LEVELS = [
  { value: 'none', label: 'No Access' },
  { value: 'view', label: 'View Only' },
  { value: 'edit', label: 'View & Edit' },
  { value: 'full', label: 'Full Access (CRUD)' },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string | null;
  userName?: string;
}

export function ModuleAccessDialog({ open, onOpenChange, userId, userName }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [access, setAccess] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    supabase
      .from('user_module_access')
      .select('module, access_level')
      .eq('user_id', userId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        MODULES.forEach((m) => { map[m.key] = 'none'; });
        data?.forEach((r: any) => { map[r.module] = r.access_level; });
        setAccess(map);
        setLoading(false);
      });
  }, [open, userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const rows = MODULES.map((m) => ({
        user_id: userId,
        module: m.key,
        access_level: access[m.key] || 'none',
      }));
      const { error } = await supabase
        .from('user_module_access')
        .upsert(rows, { onConflict: 'user_id,module' });
      if (error) throw error;
      toast({ title: 'Access updated', description: `Module access saved for ${userName || 'user'}.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Module Access</DialogTitle>
          <DialogDescription>
            Grant {userName ? <strong>{userName}</strong> : 'this user'} access to specific modules. Each module can be set independently.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-3 mt-2">
            {MODULES.map((m) => (
              <div key={m.key} className="grid grid-cols-2 gap-3 items-center">
                <Label className="text-sm">{m.label}</Label>
                <Select
                  value={access[m.key] || 'none'}
                  onValueChange={(v) => setAccess({ ...access, [m.key]: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
