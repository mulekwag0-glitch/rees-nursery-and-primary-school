import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Users,
  CreditCard,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';

const reports = [
  { id: 1, name: 'Student Fee Statement', description: 'Generate payment statements for students', icon: CreditCard, category: 'Finance' },
  { id: 2, name: 'Payment Summary', description: 'Overview of all payments collected', icon: TrendingUp, category: 'Finance' },
  { id: 3, name: 'Outstanding Balances', description: 'Students with pending payments', icon: Users, category: 'Finance' },
  { id: 4, name: 'Semester Results', description: 'Results summary per semester', icon: FileText, category: 'Academic' },
  { id: 5, name: 'GPA Summary', description: 'Student GPA and CGPA report', icon: GraduationCap, category: 'Academic' },
  { id: 6, name: 'Student Enrollment', description: 'Enrollment statistics by program', icon: Users, category: 'Academic' },
];

export default function Reports() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and download system reports</p>
        </div>

        {/* Finance Reports */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Finance Reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.filter(r => r.category === 'Finance').map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="hover:shadow-card transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-success" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{report.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Academic Reports */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Academic Reports</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.filter(r => r.category === 'Academic').map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="hover:shadow-card transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{report.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
