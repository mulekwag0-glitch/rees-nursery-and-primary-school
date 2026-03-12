import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Plus,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Programs() {
  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs-with-stats'],
    queryFn: async () => {
      const { data: progs, error } = await supabase.from('programs').select('*').order('code');
      if (error) throw error;

      // Get student counts per program
      const { data: students } = await supabase.from('students').select('program_id').eq('status', 'active');
      const { data: courses } = await supabase.from('courses').select('program_id');

      return progs.map(p => ({
        ...p,
        studentCount: students?.filter(s => s.program_id === p.id).length || 0,
        courseCount: courses?.filter(c => c.program_id === p.id).length || 0,
      }));
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
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

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {programs?.map((program) => (
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
                      <p className="text-2xl font-bold text-primary">{program.duration_years}</p>
                      <p className="text-xs text-muted-foreground">Years</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-secondary">{program.studentCount}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-accent-foreground">{program.courseCount}</p>
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
        )}
      </div>
    </DashboardLayout>
  );
}
