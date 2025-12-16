import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Send, CheckCircle, Clock, Search, Loader2 } from 'lucide-react';

interface StudentResult {
  id: string;
  studentCourseId: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  courseworkMarks: number | null;
  examMarks: number | null;
  totalMarks: number | null;
  grade: string | null;
  gradePoint: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

const calculateGrade = (marks: number): { grade: string; gradePoint: number } => {
  if (marks >= 70) return { grade: 'A', gradePoint: 5 };
  if (marks >= 60) return { grade: 'B', gradePoint: 4 };
  if (marks >= 50) return { grade: 'C', gradePoint: 3 };
  if (marks >= 45) return { grade: 'D', gradePoint: 2 };
  return { grade: 'F', gradePoint: 0 };
};

export function ResultsEntryForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localResults, setLocalResults] = useState<Map<string, { cw: number | null; exam: number | null }>>(new Map());
  const [saving, setSaving] = useState(false);

  // Fetch tutor's assigned courses
  const { data: tutorCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['tutor-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tutor_courses')
        .select(`
          id,
          course_id,
          courses:course_id (
            id,
            code,
            name,
            credit_units
          ),
          semesters:semester_id (
            id,
            name,
            results_open
          )
        `)
        .eq('tutor_id', user?.id || '');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch students enrolled in selected course
  const { data: enrolledStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['enrolled-students', selectedCourse],
    queryFn: async () => {
      const course = tutorCourses?.find((tc: any) => tc.course_id === selectedCourse);
      if (!course) return [];

      const { data, error } = await supabase
        .from('student_courses')
        .select(`
          id,
          students:student_id (
            id,
            student_id,
            profiles:user_id (full_name)
          ),
          results (
            id,
            coursework_marks,
            exam_marks,
            total_marks,
            grade,
            grade_point,
            status
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('semester_id', course.semesters?.id || '');

      if (error) throw error;
      return data?.map((sc: any) => ({
        id: sc.students?.id,
        studentCourseId: sc.id,
        studentId: sc.students?.student_id,
        studentName: sc.students?.profiles?.full_name || 'Unknown',
        studentNumber: sc.students?.student_id,
        courseworkMarks: sc.results?.[0]?.coursework_marks ?? null,
        examMarks: sc.results?.[0]?.exam_marks ?? null,
        totalMarks: sc.results?.[0]?.total_marks ?? null,
        grade: sc.results?.[0]?.grade ?? null,
        gradePoint: sc.results?.[0]?.grade_point ?? null,
        status: sc.results?.[0]?.status ?? 'draft',
        resultId: sc.results?.[0]?.id,
      })) || [];
    },
    enabled: !!selectedCourse && !!tutorCourses,
  });

  const saveMutation = useMutation({
    mutationFn: async (results: any[]) => {
      const promises = results.map(async (result) => {
        const cw = localResults.get(result.studentCourseId)?.cw ?? result.courseworkMarks ?? 0;
        const exam = localResults.get(result.studentCourseId)?.exam ?? result.examMarks ?? 0;
        const total = cw + exam;
        const { grade, gradePoint } = calculateGrade(total);

        if (result.resultId) {
          // Update existing result
          return supabase
            .from('results')
            .update({
              coursework_marks: cw,
              exam_marks: exam,
              total_marks: total,
              grade,
              grade_point: gradePoint,
              status: 'draft',
              tutor_id: user?.id,
            })
            .eq('id', result.resultId);
        } else {
          // Insert new result
          return supabase
            .from('results')
            .insert({
              student_course_id: result.studentCourseId,
              coursework_marks: cw,
              exam_marks: exam,
              total_marks: total,
              grade,
              grade_point: gradePoint,
              status: 'draft',
              tutor_id: user?.id,
            });
        }
      });

      const responses = await Promise.all(promises);
      const errors = responses.filter((r) => r.error);
      if (errors.length > 0) throw new Error('Some results failed to save');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
      toast({ title: 'Success', description: 'Results saved as draft' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (results: any[]) => {
      // First save all results
      await saveMutation.mutateAsync(results);

      // Then update status to submitted
      const { error } = await supabase
        .from('results')
        .update({ status: 'submitted' })
        .in('student_course_id', results.map((r) => r.studentCourseId));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
      toast({ title: 'Success', description: 'Results submitted for approval' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleMarksChange = useCallback((studentCourseId: string, field: 'cw' | 'exam', value: string) => {
    const numValue = value === '' ? null : Math.min(field === 'cw' ? 40 : 60, Math.max(0, parseFloat(value)));
    setLocalResults((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentCourseId) || { cw: null, exam: null };
      newMap.set(studentCourseId, { ...existing, [field]: numValue });
      return newMap;
    });
  }, []);

  const getComputedValues = (student: any) => {
    const local = localResults.get(student.studentCourseId);
    const cw = local?.cw ?? student.courseworkMarks ?? 0;
    const exam = local?.exam ?? student.examMarks ?? 0;
    const total = (cw || 0) + (exam || 0);
    const { grade, gradePoint } = total > 0 ? calculateGrade(total) : { grade: null, gradePoint: null };
    return { cw, exam, total: total || null, grade, gradePoint };
  };

  const filteredStudents = enrolledStudents?.filter(
    (s: any) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCourseData = tutorCourses?.find((tc: any) => tc.course_id === selectedCourse);

  const getGradeBadgeClass = (grade: string | null) => {
    const classes: Record<string, string> = {
      A: 'bg-success/20 text-success',
      B: 'bg-primary/20 text-primary',
      C: 'bg-warning/20 text-warning',
      D: 'bg-orange-500/20 text-orange-600',
      F: 'bg-destructive/20 text-destructive',
    };
    return grade ? classes[grade] || '' : '';
  };

  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enter Results</CardTitle>
          <CardDescription>Select a course to enter student marks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {tutorCourses?.map((tc: any) => (
                  <SelectItem key={tc.course_id} value={tc.course_id}>
                    {tc.courses?.code} - {tc.courses?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Entry Table */}
      {selectedCourse && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedCourseData?.courses?.code} - {selectedCourseData?.courses?.name}
              </CardTitle>
              <CardDescription>
                {filteredStudents?.length || 0} students registered • {selectedCourseData?.semesters?.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => saveMutation.mutate(filteredStudents || [])}
                disabled={saveMutation.isPending || !filteredStudents?.length}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={() => submitMutation.mutate(filteredStudents || [])}
                disabled={submitMutation.isPending || !filteredStudents?.length}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredStudents?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students enrolled in this course
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th className="text-center w-24">CW (40)</th>
                      <th className="text-center w-24">Exam (60)</th>
                      <th className="text-center w-20">Total</th>
                      <th className="text-center w-20">Grade</th>
                      <th className="text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents?.map((student: any) => {
                      const computed = getComputedValues(student);
                      return (
                        <tr key={student.studentCourseId}>
                          <td className="font-mono text-sm">{student.studentNumber}</td>
                          <td className="font-medium">{student.studentName}</td>
                          <td className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max="40"
                              value={computed.cw ?? ''}
                              onChange={(e) =>
                                handleMarksChange(student.studentCourseId, 'cw', e.target.value)
                              }
                              className="w-20 text-center mx-auto"
                              disabled={student.status === 'submitted' || student.status === 'approved'}
                            />
                          </td>
                          <td className="text-center">
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              value={computed.exam ?? ''}
                              onChange={(e) =>
                                handleMarksChange(student.studentCourseId, 'exam', e.target.value)
                              }
                              className="w-20 text-center mx-auto"
                              disabled={student.status === 'submitted' || student.status === 'approved'}
                            />
                          </td>
                          <td className="text-center font-medium">{computed.total ?? '-'}</td>
                          <td className="text-center">
                            {computed.grade ? (
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${getGradeBadgeClass(computed.grade)}`}
                              >
                                {computed.grade}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="text-center">
                            {student.status === 'approved' ? (
                              <CheckCircle className="w-4 h-4 text-success mx-auto" />
                            ) : student.status === 'submitted' ? (
                              <span className="text-xs text-warning">Submitted</span>
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
                            )}
                          </td>
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