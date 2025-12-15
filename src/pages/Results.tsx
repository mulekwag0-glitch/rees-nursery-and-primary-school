import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  Search,
  Save,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

// Mock data for tutor view
const resultsEntryData = [
  { id: 1, studentId: 'STU2024001', name: 'John Mukasa', cw: 35, exam: 52, total: 87, grade: 'A', status: 'entered' },
  { id: 2, studentId: 'STU2024002', name: 'Sarah Nambi', cw: 28, exam: 45, total: 73, grade: 'A', status: 'entered' },
  { id: 3, studentId: 'STU2024003', name: 'James Okello', cw: 22, exam: 35, total: 57, grade: 'C', status: 'entered' },
  { id: 4, studentId: 'STU2024004', name: 'Grace Namutebi', cw: null, exam: null, total: null, grade: null, status: 'pending' },
  { id: 5, studentId: 'STU2024005', name: 'Peter Ssali', cw: null, exam: null, total: null, grade: null, status: 'pending' },
];

// Mock data for student view
const studentResultsData = [
  { semester: 'Sem 1, 2024/2025', courses: [
    { code: 'ICT201', name: 'Database Systems', cu: 4, cw: 35, exam: 52, total: 87, grade: 'A', gp: 5 },
    { code: 'ICT202', name: 'Data Structures', cu: 4, cw: 28, exam: 45, total: 73, grade: 'A', gp: 5 },
    { code: 'MTH201', name: 'Statistics', cu: 3, cw: 25, exam: 40, total: 65, grade: 'B', gp: 4 },
  ], gpa: 4.64 },
  { semester: 'Sem 2, 2023/2024', courses: [
    { code: 'ICT102', name: 'Programming Basics', cu: 4, cw: 30, exam: 48, total: 78, grade: 'A', gp: 5 },
    { code: 'ICT103', name: 'Computer Networks', cu: 3, cw: 26, exam: 38, total: 64, grade: 'B', gp: 4 },
  ], gpa: 4.43 },
];

const getGradeBadge = (grade: string | null) => {
  if (!grade) return null;
  const styles: Record<string, string> = {
    'A': 'badge-grade badge-grade-a',
    'B': 'badge-grade badge-grade-b',
    'C': 'badge-grade badge-grade-c',
    'D': 'badge-grade badge-grade-d',
    'F': 'badge-grade badge-grade-f',
  };
  return <span className={styles[grade] || 'badge-grade'}>{grade}</span>;
};

function TutorResultsView() {
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
            <select className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>ICT201 - Database Systems</option>
              <option>ICT202 - Data Structures</option>
              <option>ICT203 - Web Development</option>
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Entry Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">ICT201 - Database Systems</CardTitle>
            <CardDescription>45 students registered • Semester 1, 2024/2025</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Submit Results
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                {resultsEntryData.map((student) => (
                  <tr key={student.id}>
                    <td className="font-mono text-sm">{student.studentId}</td>
                    <td className="font-medium">{student.name}</td>
                    <td className="text-center">
                      <Input 
                        type="number" 
                        min="0" 
                        max="40" 
                        defaultValue={student.cw ?? ''} 
                        className="w-20 text-center mx-auto"
                      />
                    </td>
                    <td className="text-center">
                      <Input 
                        type="number" 
                        min="0" 
                        max="60" 
                        defaultValue={student.exam ?? ''} 
                        className="w-20 text-center mx-auto"
                      />
                    </td>
                    <td className="text-center font-medium">
                      {student.total ?? '-'}
                    </td>
                    <td className="text-center">
                      {getGradeBadge(student.grade) ?? '-'}
                    </td>
                    <td className="text-center">
                      {student.status === 'entered' ? (
                        <CheckCircle className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentResultsView() {
  return (
    <div className="space-y-6">
      {studentResultsData.map((semester, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{semester.semester}</CardTitle>
                <CardDescription>Semester GPA: {semester.gpa.toFixed(2)}</CardDescription>
              </div>
              <Button variant="outline" size="sm">Download PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th className="text-center">CU</th>
                    <th className="text-center">CW</th>
                    <th className="text-center">Exam</th>
                    <th className="text-center">Total</th>
                    <th className="text-center">Grade</th>
                    <th className="text-center">GP</th>
                  </tr>
                </thead>
                <tbody>
                  {semester.courses.map((course, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{course.code}</td>
                      <td>{course.name}</td>
                      <td className="text-center">{course.cu}</td>
                      <td className="text-center">{course.cw}</td>
                      <td className="text-center">{course.exam}</td>
                      <td className="text-center font-medium">{course.total}</td>
                      <td className="text-center">{getGradeBadge(course.grade)}</td>
                      <td className="text-center font-medium">{course.gp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminResultsView() {
  const pendingApprovals = [
    { id: 1, course: 'ICT201', name: 'Database Systems', tutor: 'Dr. Sarah Nambi', students: 45, submitted: '2024-01-15', status: 'pending' },
    { id: 2, course: 'MTH201', name: 'Statistics', tutor: 'Mr. James Okello', students: 52, submitted: '2024-01-14', status: 'pending' },
    { id: 3, course: 'BUS201', name: 'Business Communication', tutor: 'Ms. Grace Namutebi', students: 38, submitted: '2024-01-13', status: 'approved' },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Results Awaiting Approval</CardTitle>
              <CardDescription>Review and approve submitted results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.filter(r => r.status === 'pending').map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-soft transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{result.course} - {result.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {result.tutor} • {result.students} students • Submitted {result.submitted}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button variant="destructive" size="sm">Reject</Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                View approved results for all courses
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                Browse all results across semesters
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Results() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results Management</h1>
          <p className="text-muted-foreground">
            {role === 'student' && 'View your academic results and GPA'}
            {role === 'tutor' && 'Enter and submit student results'}
            {role === 'admin' && 'Review and approve submitted results'}
          </p>
        </div>

        {/* Role-specific view */}
        {role === 'tutor' && <TutorResultsView />}
        {role === 'student' && <StudentResultsView />}
        {role === 'admin' && <AdminResultsView />}
      </div>
    </DashboardLayout>
  );
}
