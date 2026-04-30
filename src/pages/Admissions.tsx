import React, { useState, useRef } from 'react';
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
import { UserPlus, Search, Loader2, GraduationCap, Phone, MapPin, Camera, X } from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { admissionSchema, validateForm } from '@/lib/validation';

export default function Admissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [gender, setGender] = useState('');
  const [programId, setProgramId] = useState('');
  const [currentYear, setCurrentYear] = useState('1');
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
        .select(`*, programs:program_id (name, code)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: semesters } = useQuery({
    queryKey: ['current-semesters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, semester_number, academic_year_id')
        .eq('is_current', true);
      if (error) throw error;
      return data;
    },
  });

  // Auto-generate student ID in REES/YYYY/NNN format.
  // Uses the highest existing numeric suffix for the current year so we never
  // collide with the UNIQUE constraint on students.student_id.
  const generateStudentId = () => {
    const year = new Date().getFullYear();
    const prefix = `REES/${year}/`;
    let max = 0;
    (students || []).forEach((s: any) => {
      const id: string = s.student_id || '';
      if (id.startsWith(prefix)) {
        const n = parseInt(id.slice(prefix.length), 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    });
    return `${prefix}${(max + 1).toString().padStart(3, '0')}`;
  };

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

  const admitMutation = useMutation({
    mutationFn: async () => {
      const v = validateForm(admissionSchema, {
        fullName, email, phone, programId, currentYear: parseInt(currentYear),
      });
      const studentIdNumber = generateStudentId();

      // Create the pupil record directly. A user account is NOT required
      // — pupils don't sign in to the system. The auto-enroll trigger will
      // place them in the current term's subjects so results can be entered.
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          student_id: studentIdNumber,
          program_id: programId,
          current_year: parseInt(currentYear),
          status: 'active',
          full_name: (fullName || '').toUpperCase(),
          gender: gender || null,
          parent_contact: parentContact || null,
        })
        .select('id')
        .single();
      if (studentError) throw studentError;

      // Optional: upload a passport photo to storage under the new pupil's id
      if (passportPhoto) {
        try {
          const fileExt = passportPhoto.name.split('.').pop();
          await supabase.storage
            .from('student-photos')
            .upload(`${studentData.id}/passport.${fileExt}`, passportPhoto, { upsert: true });
        } catch (e) {
          console.error('Photo upload failed (non-fatal):', e);
        }
      }

      const selectedProgram = programs?.find(p => p.id === programId);
      await logAudit('student_admitted', 'students', studentData.id, null, {
        student_id: studentIdNumber,
        program_id: programId,
        program_name: selectedProgram?.name,
      });

      return { studentIdNumber };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-students'] });
      toast({
        title: 'Pupil Admitted Successfully',
        description: `Reg No: ${data.studentIdNumber}. Pupil has been auto-enrolled in current term subjects.`,
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
    setParentContact('');
    setGender('');
    setProgramId('');
    setCurrentYear('1');
    setPassportPhoto(null);
    setPhotoPreview(null);
    setOpen(false);
  };

  const filteredStudents = students?.filter((s: any) => {
    const matchesSearch =
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email || ''?.toLowerCase().includes(searchTerm.toLowerCase());
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
                {/* Passport Photo Upload */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div 
                      className="w-28 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Passport" className="w-full h-full object-cover" />
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Kato" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Contact</Label>
                    <Input type="tel" value={parentContact} onChange={(e) => setParentContact(e.target.value)} placeholder="+256..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <strong>Auto-generated Reg No:</strong> {generateStudentId()}
                  </p>
                  {semesters && semesters.length > 0 && (
                    <p className="text-muted-foreground mt-1">
                      <strong>Auto-enroll:</strong> Pupil will be enrolled in subjects for{' '}
                      <span className="font-semibold">{semesters.map(s => s.name).join(', ')}</span>{' '}
                      (current {semesters.length === 1 ? 'term' : 'terms'})
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={admitMutation.isPending || !fullName || !programId}>
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
                      <th>Photo</th>
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
                        <td>
                          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                            {s.profiles?.avatar_url ? (
                              <img src={s.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-sm">{s.student_id}</td>
                        <td className="font-medium uppercase">{s.full_name}</td>
                        <td className="text-sm text-muted-foreground">{s.email || ''}</td>
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
