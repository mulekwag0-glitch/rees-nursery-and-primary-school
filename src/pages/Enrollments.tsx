import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  BookOpen,
  Plus,
  Search,
  Loader2,
  UserPlus,
  Trash2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  program_id: string;
  current_year: number;
  programs: {
    name: string;
    code: string;
  };
}

interface Course {
  id: string;
  code: string;
  name: string;
  credit_units: number;
  year_of_study: number;
  semester_number: number;
}

interface Semester {
  id: string;
  name: string;
  is_current: boolean;
}

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  semester_id: string;
  students: {
    student_id: string;
    full_name: string;
  };
  courses: {
    code: string;
    name: string;
    credit_units: number;
  };
}

export default function Enrollments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      fetchEnrollments();
    }
  }, [selectedSemester]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students with profiles and programs
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          full_name,
          program_id,
          current_year,
          programs(name, code)
        `)
        .eq('status', 'active');

      if (studentsError) throw studentsError;
      setStudents(studentsData as unknown as Student[]);

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, code, name, credit_units, year_of_study, semester_number')
        .order('year_of_study')
        .order('semester_number');

      if (coursesError) throw coursesError;
      setCourses(coursesData);

      // Fetch semesters
      const { data: semestersData, error: semestersError } = await supabase
        .from('semesters')
        .select('id, name, is_current')
        .order('created_at', { ascending: false });

      if (semestersError) throw semestersError;
      setSemesters(semestersData);

      // Set current semester as default
      const currentSem = semestersData.find(s => s.is_current);
      if (currentSem) {
        setSelectedSemester(currentSem.id);
      } else if (semestersData.length > 0) {
        setSelectedSemester(semestersData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    if (!selectedSemester) return;

    try {
      const { data, error } = await supabase
        .from('student_courses')
        .select(`
          id,
          student_id,
          course_id,
          semester_id,
          students(
            student_id,
            full_name
          ),
          courses(code, name, credit_units)
        `)
        .eq('semester_id', selectedSemester);

      if (error) throw error;
      setEnrollments(data as unknown as Enrollment[]);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudent || selectedCourses.length === 0 || !selectedSemester) {
      toast({
        title: 'Validation Error',
        description: 'Please select a student and at least one course',
        variant: 'destructive',
      });
      return;
    }

    setFormLoading(true);
    try {
      const enrollmentRecords = selectedCourses.map(courseId => ({
        student_id: selectedStudent,
        course_id: courseId,
        semester_id: selectedSemester,
      }));

      const { error } = await supabase
        .from('student_courses')
        .insert(enrollmentRecords);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Student enrolled in ${selectedCourses.length} course(s)`,
      });

      setShowEnrollModal(false);
      setSelectedStudent('');
      setSelectedCourses([]);
      fetchEnrollments();
    } catch (error: any) {
      console.error('Error enrolling student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll student',
        variant: 'destructive',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Remove this course enrollment?')) return;

    try {
      const { error } = await supabase
        .from('student_courses')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Enrollment removed',
      });

      fetchEnrollments();
    } catch (error: any) {
      console.error('Error removing enrollment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove enrollment',
        variant: 'destructive',
      });
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Group enrollments by student
  const groupedEnrollments = enrollments.reduce((acc, enrollment) => {
    const studentId = enrollment.student_id;
    if (!acc[studentId]) {
      acc[studentId] = {
        student: enrollment.students,
        courses: [],
      };
    }
    acc[studentId].courses.push({
      id: enrollment.id,
      ...enrollment.courses,
    });
    return acc;
  }, {} as Record<string, { student: any; courses: any[] }>);

  const filteredEnrollments = Object.entries(groupedEnrollments).filter(([_, data]) =>
    data.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    data.student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Course Enrollments</h1>
            <p className="text-muted-foreground">Manage student course enrollments per semester</p>
          </div>
          <Button onClick={() => setShowEnrollModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Enroll Student
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search students..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(sem => (
                    <SelectItem key={sem.id} value={sem.id}>
                      {sem.name} {sem.is_current && '(Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enrollments.length}</p>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(groupedEnrollments).length}</p>
                  <p className="text-sm text-muted-foreground">Students Enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Available Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrollments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Enrollments</CardTitle>
            <CardDescription>
              {semesters.find(s => s.id === selectedSemester)?.name || 'Select a semester'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No enrollments found for this semester
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEnrollments.map(([studentId, data]) => (
                  <Card key={studentId} className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{data.student.full_name}</CardTitle>
                          <CardDescription>{data.student.student_id}</CardDescription>
                        </div>
                        <Badge variant="secondary">{data.courses.length} courses</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {data.courses.map((course: any) => (
                          <div 
                            key={course.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                          >
                            <span className="font-medium">{course.code}</span>
                            <span className="text-muted-foreground">({course.credit_units} CU)</span>
                            <button
                              onClick={() => handleRemoveEnrollment(course.id)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enroll Modal */}
        <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enroll Student in Courses</DialogTitle>
              <DialogDescription>
                Select a student and choose courses for {semesters.find(s => s.id === selectedSemester)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.student_id}) - {student.programs.code} Year {student.current_year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Courses</Label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {courses.map(course => (
                    <div 
                      key={course.id}
                      className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => toggleCourseSelection(course.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{course.code} - {course.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Year {course.year_of_study}, Sem {course.semester_number} • {course.credit_units} Credit Units
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedCourses.length} course(s) selected
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEnrollModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleEnrollStudent} disabled={formLoading}>
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enroll Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
