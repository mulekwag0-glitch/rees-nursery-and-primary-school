import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const courses = [
  { id: 1, code: 'ICT101', name: 'Computer Fundamentals', program: 'B.IT', cu: 4, year: 1, semester: 1, students: 52, tutor: 'Dr. Sarah Nambi' },
  { id: 2, code: 'ICT102', name: 'Programming Basics', program: 'B.IT', cu: 4, year: 1, semester: 2, students: 48, tutor: 'Mr. James Okello' },
  { id: 3, code: 'ICT201', name: 'Database Systems', program: 'B.IT', cu: 4, year: 2, semester: 1, students: 45, tutor: 'Dr. Sarah Nambi' },
  { id: 4, code: 'MTH101', name: 'Mathematics I', program: 'B.IT', cu: 3, year: 1, semester: 1, students: 52, tutor: 'Mr. Peter Ssali' },
  { id: 5, code: 'BUS101', name: 'Introduction to Business', program: 'BBA', cu: 3, year: 1, semester: 1, students: 38, tutor: 'Ms. Grace Namutebi' },
];

export default function Courses() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Courses</h1>
            <p className="text-muted-foreground">Manage academic courses and assignments</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Course
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search courses..." className="pl-10" />
              </div>
              <select className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">All Programs</option>
                <option value="bit">B.IT</option>
                <option value="bba">BBA</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-card transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{course.code}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">{course.program}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Course</DropdownMenuItem>
                      <DropdownMenuItem>View Students</DropdownMenuItem>
                      <DropdownMenuItem>Assign Tutor</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-medium mb-2">{course.name}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Credit Units</span>
                    <span className="font-medium text-foreground">{course.cu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Year / Semester</span>
                    <span className="font-medium text-foreground">Y{course.year} / S{course.semester}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enrolled</span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {course.students}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tutor</span>
                    <span className="font-medium text-foreground">{course.tutor}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
