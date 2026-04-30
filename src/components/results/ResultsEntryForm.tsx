import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Send, CheckCircle, Clock, Search, Loader2, Trash2 } from 'lucide-react';
import { notifyResultsSubmitted } from '@/lib/notifications';

// Grade is computed server-side by the results_set_grade trigger using
// the Uganda grading bands (lower vs upper primary). This helper is just
// for live preview while the tutor types.
const previewGrade = (marks: number, level: 'lower' | 'upper'): string => {
  if (level === 'upper') {
    if (marks >= 95) return 'D1';
    if (marks >= 80) return 'D2';
  } else {
    if (marks >= 90) return 'D1';
    if (marks >= 80) return 'D2';
  }
  if (marks >= 60) return 'C3';
  if (marks >= 55) return 'C4';
  if (marks >= 50) return 'C6';
  if (marks >= 45) return 'P7';
  if (marks >= 40) return 'P8';
  return 'F9';
};

export function ResultsEntryForm() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localResults, setLocalResults] = useState<Map<string, { total: number | null }>>(new Map());

  // Programs (classes)
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Semesters (terms)
  const { data: semesters } = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, semester_number, results_open, is_current')
        .order('semester_number');
      if (error) throw error;
      // auto-pick current
      const current = data?.find((s: any) => s.is_current);
      if (current && !selectedSemester) setSelectedSemester(current.id);
      return data;
    },
  });

  // Courses (subjects) for selected program
  const { data: courses } = useQuery({
    queryKey: ['program-courses', selectedProgram],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, credit_units')
        .eq('program_id', selectedProgram)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgram,
  });

  // Students enrolled in selected course+semester
  const { data: enrolledStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-results', selectedCourse, selectedSemester],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_courses')
        .select(`
          id,
          students:student_id (id, student_id, full_name),
          results (id, coursework_marks, exam_marks, total_marks, grade, grade_point, status)
        `)
        .eq('course_id', selectedCourse)
        .eq('semester_id', selectedSemester);
      if (error) throw error;
      return (data || []).map((sc: any) => ({
        studentCourseId: sc.id,
        studentId: sc.students?.id,
        studentName: sc.students?.full_name || 'Unknown',
        studentNumber: sc.students?.student_id,
        courseworkMarks: sc.results?.[0]?.coursework_marks ?? null,
        examMarks: sc.results?.[0]?.exam_marks ?? null,
        totalMarks: sc.results?.[0]?.total_marks ?? null,
        grade: sc.results?.[0]?.grade ?? null,
        gradePoint: sc.results?.[0]?.grade_point ?? null,
        status: sc.results?.[0]?.status ?? 'draft',
        resultId: sc.results?.[0]?.id,
      })).sort((a: any, b: any) => (a.studentName || '').localeCompare(b.studentName || ''));
    },
    enabled: !!selectedCourse && !!selectedSemester,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ status }: { status: 'draft' | 'submitted' }) => {
      const list = enrolledStudents || [];
      // Validate every entered/edited mark is within 0–100
      const invalid: string[] = [];
      list.forEach((s: any) => {
        const local = localResults.get(s.studentCourseId);
        const total = local?.total ?? s.totalMarks;
        if (total === null || total === undefined) return;
        const n = Number(total);
        if (Number.isNaN(n) || n < 0 || n > 100) {
          invalid.push(`${s.studentName} (${n})`);
        }
      });
      if (invalid.length) {
        throw new Error(`Marks must be between 0 and 100. Fix: ${invalid.join(', ')}`);
      }
      // Submit only the rows the tutor actually entered/edited this session,
      // OR existing rows that already have marks. This allows updating one
      // pupil at a time without needing every pupil's marks.
      const rows = list
        .filter((s: any) => {
          const local = localResults.get(s.studentCourseId);
          if (local && local.total !== null && local.total !== undefined) return true;
          // For submit, also include existing rows that already have marks
          if (status === 'submitted' && s.resultId && s.totalMarks != null) return true;
          return false;
        })
        .map((s: any) => {
          const local = localResults.get(s.studentCourseId);
          const total = local?.total ?? s.totalMarks ?? 0;
          // total_marks is now a plain numeric column (no longer generated).
          // grade/grade_point are computed by the results_set_grade DB trigger
          // using the Uganda grading bands, so we don't send them here.
          const row: any = {
            student_course_id: s.studentCourseId,
            total_marks: total,
            status,
            tutor_id: user?.id,
            rejection_reason: null,
            approved_by: null,
            approved_at: null,
          };
          if (s.resultId) row.id = s.resultId;
          return row;
        });

      if (rows.length === 0) {
        throw new Error(
          status === 'submitted'
            ? 'Enter marks for at least one pupil before submitting'
            : 'No marks entered'
        );
      }

      const { error } = await supabase
        .from('results')
        .upsert(rows, { onConflict: 'student_course_id' });
      if (error) throw error;

      // On submission, notify all admins + headmistress so the bell badge updates
      if (status === 'submitted') {
        try {
          const courseName =
            (courses as any)?.find((c: any) => c.id === selectedCourse)?.name || 'a subject';
          const tutorName =
            (user as any)?.user_metadata?.full_name || (user as any)?.email || 'A teacher';

          const { data: approverRoles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('role', ['admin', 'headmistress'] as any);

          const approverIds = Array.from(
            new Set((approverRoles || []).map((r: any) => r.user_id).filter(Boolean))
          );
          if (approverIds.length) {
            await notifyResultsSubmitted(approverIds, tutorName, courseName);
          }
        } catch (e) {
          console.error('notifyResultsSubmitted failed', e);
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['class-results'] });
      // Make sure the admin "Pending Approval" view refreshes immediately
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setLocalResults(new Map());
      toast({
        title: 'Saved',
        description:
          vars.status === 'submitted'
            ? 'Results submitted — Head Teacher / Admin notified for approval'
            : 'Results saved as draft',
      });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const { error } = await supabase.from('results').delete().eq('id', resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-results'] });
      toast({ title: 'Deleted', description: 'Result removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleTotalChange = useCallback((studentCourseId: string, value: string) => {
    const numValue = value === '' ? null : Math.min(100, Math.max(0, parseFloat(value) || 0));
    setLocalResults((prev) => {
      const newMap = new Map(prev);
      newMap.set(studentCourseId, { total: numValue });
      return newMap;
    });
  }, []);

  const getComputed = (s: any) => {
    const local = localResults.get(s.studentCourseId);
    const total = local?.total ?? s.totalMarks;
    const hasMarks = total != null;
    const programCode = (programs?.find((p: any) => p.id === selectedProgram) as any)?.code || '';
    const level: 'lower' | 'upper' = ['P4', 'P5', 'P6', 'P7'].includes(programCode) ? 'upper' : 'lower';
    const grade = hasMarks ? previewGrade(total as number, level) : null;
    return { total: hasMarks ? total : null, grade };
  };

  const filtered = useMemo(
    () =>
      (enrolledStudents || []).filter(
        (s: any) =>
          s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.studentNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [enrolledStudents, searchTerm]
  );

  const selectedSemesterData = semesters?.find((s: any) => s.id === selectedSemester);
  const canEdit = role === 'admin' || role === 'headmistress' || role === 'tutor';
  const resultsLocked = !selectedSemesterData?.results_open && role !== 'admin';

  // Determine which grading band applies to the selected class
  const selectedProgramCode = (programs?.find((p: any) => p.id === selectedProgram) as any)?.code || '';
  const isUpperPrimary = ['P4', 'P5', 'P6', 'P7'].includes(selectedProgramCode);
  const gradingBand = isUpperPrimary
    ? [
        ['D1', '95–100'], ['D2', '80–94'], ['C3', '60–79'], ['C4', '55–59'],
        ['C6', '50–54'], ['P7', '45–49'], ['P8', '40–44'], ['F9', '0–39'],
      ]
    : [
        ['D1', '90–100'], ['D2', '80–89'], ['C3', '60–79'], ['C4', '55–59'],
        ['C6', '50–54'], ['P7', '45–49'], ['P8', '40–44'], ['F9', '0–39'],
      ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results Entry</CardTitle>
          <CardDescription>Filter by class, term, and subject to enter pupil marks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select value={selectedProgram} onValueChange={(v) => { setSelectedProgram(v); setSelectedCourse(''); }}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                {programs?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                {semesters?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}{s.is_current ? ' (Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={!selectedProgram}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {courses?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search pupil..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedCourse && selectedSemester && (
        <Card>
          <div className="px-6 pt-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-semibold text-primary">
                Uganda Grading Bands — {isUpperPrimary ? 'Upper Primary (P4–P7)' : 'Lower Primary (P1–P3)'}:
              </span>{' '}
              {gradingBand.map(([g, r], i) => (
                <span key={g} className="ml-1">
                  <strong>{g}</strong> {r}{i < gradingBand.length - 1 ? ' ·' : ''}
                </span>
              ))}
            </div>
          </div>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                {courses?.find((c: any) => c.id === selectedCourse)?.name} — {programs?.find((p: any) => p.id === selectedProgram)?.name}
              </CardTitle>
              <CardDescription>
                {filtered.length} pupils • {selectedSemesterData?.name}
                {resultsLocked && <span className="text-destructive ml-2">• Results closed</span>}
              </CardDescription>
            </div>
            {canEdit && !resultsLocked && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => upsertMutation.mutate({ status: 'draft' })}
                  disabled={upsertMutation.isPending || !filtered.length}
                >
                  {upsertMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Draft
                </Button>
                <Button
                  onClick={() => upsertMutation.mutate({ status: 'submitted' })}
                  disabled={upsertMutation.isPending || !filtered.length}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filtered.length ? (
              <p className="text-center text-muted-foreground py-8">No pupils found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Name</th>
                      <th className="text-center w-28">Total Marks (/100)</th>
                      <th className="text-center w-20">Grade</th>
                      <th className="text-center w-24">Status</th>
                      {canEdit && <th className="text-center w-16">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => {
                      const c = getComputed(s);
                      const locked = (s.status === 'submitted' || s.status === 'approved') && role === 'tutor';
                      return (
                        <tr key={s.studentCourseId}>
                          <td className="font-mono text-xs">{s.studentNumber}</td>
                          <td className="font-medium">{s.studentName}</td>
                          <td className="text-center">
                            <Input type="number" min="0" max="100" value={c.total ?? ''}
                              onChange={(e) => handleTotalChange(s.studentCourseId, e.target.value)}
                              className="w-24 text-center mx-auto" disabled={locked || resultsLocked || !canEdit}
                            />
                          </td>
                          <td className="text-center">
                            {c.grade ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm bg-primary/10 text-primary">
                                {c.grade}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="text-center">
                            {s.status === 'approved' ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
                              : s.status === 'submitted' ? <span className="text-xs text-warning">Submitted</span>
                              : s.resultId ? <span className="text-xs text-muted-foreground">Draft</span>
                              : <Clock className="w-4 h-4 text-muted-foreground mx-auto" />}
                          </td>
                          {canEdit && (
                            <td className="text-center">
                              {s.resultId && role === 'admin' && (
                                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.resultId)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
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
      )}
    </div>
  );
}
