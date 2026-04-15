import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Calendar,
  Plus,
  MoreHorizontal,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const academicYears = [
  { 
    id: 1, 
    name: '2024/2025', 
    isCurrent: true,
    semesters: [
      { id: 1, name: 'Term 1', start: '2025-02-01', end: '2025-04-30', isCurrent: true, resultsOpen: true },
      { id: 2, name: 'Term 2', start: '2025-05-15', end: '2025-08-15', isCurrent: false, resultsOpen: false },
      { id: 3, name: 'Term 3', start: '2025-09-01', end: '2025-11-30', isCurrent: false, resultsOpen: false },
    ]
  },
  { 
    id: 2, 
    name: '2023/2024', 
    isCurrent: false,
    semesters: [
      { id: 3, name: 'Term 1', start: '2024-02-01', end: '2024-04-30', isCurrent: false, resultsOpen: false },
      { id: 4, name: 'Term 2', start: '2024-05-15', end: '2024-08-15', isCurrent: false, resultsOpen: false },
      { id: 5, name: 'Term 3', start: '2024-09-01', end: '2024-11-30', isCurrent: false, resultsOpen: false },
    ]
  },
];

export default function Semesters() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Academic Calendar</h1>
            <p className="text-muted-foreground">Manage academic years and terms</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Academic Year
          </Button>
        </div>

        {/* Academic Years */}
        <div className="space-y-6">
          {academicYears.map((year) => (
            <Card key={year.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      year.isCurrent 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Academic Year {year.name}</CardTitle>
                      {year.isCurrent && (
                        <Badge className="bg-success/20 text-success border-0 mt-1">Current Year</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Year</DropdownMenuItem>
                      <DropdownMenuItem>Add Term</DropdownMenuItem>
                      {!year.isCurrent && <DropdownMenuItem>Set as Current</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {year.semesters.map((semester) => (
                    <div 
                      key={semester.id} 
                      className={`p-4 rounded-lg border-2 ${
                        semester.isCurrent ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{semester.name}</h4>
                          {semester.isCurrent && (
                            <Badge className="bg-primary/20 text-primary border-0 text-xs">Active</Badge>
                          )}
                        </div>
                        {semester.resultsOpen ? (
                          <Unlock className="w-4 h-4 text-success" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Start Date</span>
                          <span className="text-foreground">{semester.start}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>End Date</span>
                          <span className="text-foreground">{semester.end}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Results Entry</span>
                          <Switch checked={semester.resultsOpen} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
