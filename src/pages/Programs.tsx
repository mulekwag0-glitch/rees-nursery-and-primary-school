import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Plus,
  MoreHorizontal,
  Users,
  BookOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const programs = [
  { id: 1, code: 'BIT', name: 'Bachelor of Information Technology', duration: 3, students: 450, courses: 24, status: 'active' },
  { id: 2, code: 'BBA', name: 'Bachelor of Business Administration', duration: 3, students: 380, courses: 22, status: 'active' },
  { id: 3, code: 'DIT', name: 'Diploma in Information Technology', duration: 2, students: 220, courses: 16, status: 'active' },
  { id: 4, code: 'DBA', name: 'Diploma in Business Administration', duration: 2, students: 180, courses: 14, status: 'active' },
];

export default function Programs() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Programs</h1>
            <p className="text-muted-foreground">Manage academic programs and curricula</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Program
          </Button>
        </div>

        {/* Programs Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {programs.map((program) => (
            <Card key={program.id} className="hover:shadow-card transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{program.code}</CardTitle>
                      <CardDescription>{program.name}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Program</DropdownMenuItem>
                      <DropdownMenuItem>View Courses</DropdownMenuItem>
                      <DropdownMenuItem>View Students</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{program.duration}</p>
                    <p className="text-xs text-muted-foreground">Years</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-secondary">{program.students}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-accent">{program.courses}</p>
                    <p className="text-xs text-muted-foreground">Courses</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Badge className="bg-success/20 text-success border-0">Active</Badge>
                  <Button variant="outline" size="sm">Manage Curriculum</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
