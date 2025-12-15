import React from 'react';
import { StatCard } from './StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Users,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TutorDashboard() {
  const navigate = useNavigate();

  // Mock data
  const stats = {
    assignedCourses: 4,
    totalStudents: 186,
    pendingResults: 2,
    submittedResults: 2,
  };

  const courses = [
    { id: 1, code: 'ICT101', name: 'Computer Fundamentals', students: 52, progress: 100, status: 'submitted' },
    { id: 2, code: 'ICT201', name: 'Database Systems', students: 48, progress: 75, status: 'in-progress' },
    { id: 3, code: 'ICT301', name: 'Software Engineering', students: 45, progress: 0, status: 'pending' },
    { id: 4, code: 'ICT102', name: 'Programming Basics', students: 41, progress: 100, status: 'approved' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/20 text-success border-0">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-info/20 text-info border-0">Submitted</Badge>;
      case 'in-progress':
        return <Badge className="bg-warning/20 text-warning border-0">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tutor Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses and enter student results.</p>
        </div>
        <Button onClick={() => navigate('/results')}>
          <ClipboardList className="w-4 h-4 mr-2" />
          Enter Results
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned Courses"
          value={stats.assignedCourses}
          subtitle="This semester"
          icon={BookOpen}
          variant="primary"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtitle="Across all courses"
          icon={Users}
          variant="secondary"
        />
        <StatCard
          title="Pending Entry"
          value={stats.pendingResults}
          subtitle="Courses to complete"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Submitted"
          value={stats.submittedResults}
          subtitle="Awaiting approval"
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Course List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">My Courses</CardTitle>
            <CardDescription>Courses assigned to you this semester</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-soft transition-shadow"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{course.code}</h3>
                    {getStatusBadge(course.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{course.name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">
                      <Users className="w-3 h-3 inline mr-1" />
                      {course.students} students
                    </span>
                    <div className="flex-1 max-w-32">
                      <Progress value={course.progress} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground">{course.progress}%</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/results')}
                  disabled={course.status === 'approved'}
                >
                  {course.status === 'approved' ? 'View' : 'Enter Results'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-info/50 bg-info/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-info mb-1">Result Entry Guidelines</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Enter coursework marks (max 40) and exam marks (max 60) for each student</li>
                <li>• Save your progress as draft before submitting</li>
                <li>• Once submitted, results cannot be edited without admin approval</li>
                <li>• Contact the Registrar if you need to make corrections</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
