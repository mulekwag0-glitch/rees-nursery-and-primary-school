import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  pupil: any | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditPupilDialog({ pupil, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => (await supabase.from('programs').select('id, name').order('name')).data || [],
  });

  const { data: semesters } = useQuery({
    queryKey: ['current-semesters'],
    queryFn: async () => (await supabase.from('semesters').select('id, name').eq('is_current', true)).data || [],
  });

  useEffect(() => {
    if (pupil) {
      setForm({ ...pupil });
      setPassportPhoto(null);
      // Try to load existing photo
      (async () => {
        try {
          for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
            const { data } = supabase.storage.from('student-photos').getPublicUrl(`${pupil.id}/passport.${ext}`);
            if (data?.publicUrl) { setPhotoPreview(data.publicUrl); break; }
          }
        } catch { /* ignore */ }
      })();
    }
  }, [pupil]);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Photo must be less than 5MB', variant: 'destructive' });
        return;
      }
      setPassportPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('students').update({
        full_name: (form.full_name || '').toUpperCase(),
        gender: form.gender || null,
        parent_contact: form.parent_contact || null,
        program_id: form.program_id,
        current_year: parseInt(form.current_year || '1'),
        status: form.status || 'active',
      }).eq('id', pupil.id);
      if (error) throw error;

      if (passportPhoto) {
        try {
          const fileExt = passportPhoto.name.split('.').pop();
          await supabase.storage
            .from('student-photos')
            .upload(`${pupil.id}/passport.${fileExt}`, passportPhoto, { upsert: true });
        } catch (e) {
          console.error('Photo upload failed (non-fatal):', e);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-students'] });
      toast({ title: 'Updated', description: 'Pupil record updated.' });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  if (!pupil) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pupil</DialogTitle>
          <DialogDescription>Reg No: {pupil.student_id}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4 mt-2">
          {/* Passport Photo */}
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="w-28 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Passport" className="w-full h-full object-cover" onError={() => setPhotoPreview(null)} />
                ) : (
                  <div className="text-center">
                    <Camera className="w-6 h-6 mx-auto text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1 block">Passport Photo</span>
                  </div>
                )}
              </div>
              {photoPreview && (
                <button
                  type="button"
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); setPassportPhoto(null); setPhotoPreview(null); }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value.toUpperCase())} className="uppercase" required />
            </div>
            <div className="space-y-2">
              <Label>Reg No</Label>
              <Input value={pupil.student_id || ''} disabled className="bg-muted font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Parent Contact</Label>
              <Input type="tel" value={form.parent_contact || ''} onChange={(e) => set('parent_contact', e.target.value)} placeholder="+256..." />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender || ''} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class / Program *</Label>
              <Select value={form.program_id || ''} onValueChange={(v) => set('program_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {programs?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year of Study</Label>
              <Select value={String(form.current_year || '1')} onValueChange={(v) => set('current_year', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Year 1</SelectItem>
                  <SelectItem value="2">Year 2</SelectItem>
                  <SelectItem value="3">Year 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Status</Label>
              <Select value={form.status || 'active'} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {semesters && semesters.length > 0 && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              <p className="text-muted-foreground">
                <strong>Current term:</strong> {semesters.map((s: any) => s.name).join(', ')}
              </p>
            </div>
          )}

          <DialogFooter className="mt-2">
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
