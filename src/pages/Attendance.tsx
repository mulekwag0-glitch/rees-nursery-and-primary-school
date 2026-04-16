import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle, Clock, Users } from 'lucide-react';

export default function Attendance() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-attendance', selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, full_name')
        .eq('program_id', selectedClass)
        .eq('status', 'active')
        .order('student_id');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedClass,
  });

  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['attendance-records', selectedClass, selectedDate],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('program_id', selectedClass)
        .eq('attendance_date', selectedDate);
      if (error) throw error;
      // Set initial statuses from existing records
      const s: Record<string, string> = {};
      data?.forEach((r: any) => { s[r.student_id] = r.status; });
      setStatuses(prev => ({ ...prev, ...s }));
      return data;
    },
    enabled: !!selectedClass && !!selectedDate,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = students
        .filter(s => statuses[s.id])
        .map(s => ({
          student_id: s.id,
          program_id: selectedClass,
          attendance_date: selectedDate,
          status: statuses[s.id],
          recorded_by: user?.id || '',
        }));
      if (!records.length) throw new Error('Mark attendance for at least one pupil');
      
      // Upsert using ON CONFLICT
      for (const rec of records) {
        const existing = existingAttendance.find((a: any) => a.student_id === rec.student_id);
        if (existing) {
          await supabase.from('attendance').update({ status: rec.status }).eq('id', (existing as any).id);
        } else {
          const { error } = await supabase.from('attendance').insert(rec);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      toast({ title: 'Attendance saved successfully' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const setAllStatus = (status: string) => {
    const s: Record<string, string> = {};
    students.forEach(st => { s[st.id] = status; });
    setStatuses(s);
  };

  const counts = {
    present: Object.values(statuses).filter(s => s === 'present').length,
    absent: Object.values(statuses).filter(s => s === 'absent').length,
    late: Object.values(statuses).filter(s => s === 'late').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-muted-foreground">Mark and track pupil attendance per class per day</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-48" />
              {selectedClass && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => setAllStatus('present')}>All Present</Button>
                  <Button size="sm" variant="outline" onClick={() => setAllStatus('absent')}>All Absent</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedClass && (
          <>
            <div className="grid gap-3 grid-cols-3">
              <Card><CardContent className="pt-4 text-center"><CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-1" /><p className="text-xl font-bold">{counts.present}</p><p className="text-xs text-muted-foreground">Present</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><XCircle className="w-6 h-6 mx-auto text-red-600 mb-1" /><p className="text-xl font-bold">{counts.absent}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><Clock className="w-6 h-6 mx-auto text-yellow-600 mb-1" /><p className="text-xl font-bold">{counts.late}</p><p className="text-xs text-muted-foreground">Late</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Attendance - {programs.find(p => p.id === selectedClass)?.name}</CardTitle>
                <CardDescription>{selectedDate} • {students.length} pupils</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : students.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pupils enrolled in this class</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6">{i + 1}</span>
                          <div>
                            <p className="font-medium text-sm">{s.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{s.student_id}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {['present', 'late', 'absent'].map(status => (
                            <Button
                              key={status}
                              size="sm"
                              variant={statuses[s.id] === status ? 'default' : 'outline'}
                              className={statuses[s.id] === status ? (
                                status === 'present' ? 'bg-green-600 hover:bg-green-700' :
                                status === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                'bg-red-600 hover:bg-red-700'
                              ) : ''}
                              onClick={() => setStatuses(prev => ({ ...prev, [s.id]: status }))}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-4">
                      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                        {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Attendance
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
