import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { TutorDashboard } from '@/components/dashboard/TutorDashboard';
import { FinanceDashboard } from '@/components/dashboard/FinanceDashboard';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!role) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Role Not Assigned</h2>
              <p className="text-muted-foreground">
                Your account has been created, but a role has not been assigned yet. 
                Please contact the system administrator to get access to the system.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {role === 'admin' && <AdminDashboard />}
      {role === 'tutor' && <TutorDashboard />}
      {role === 'finance' && <FinanceDashboard />}
      {role === 'student' && <StudentDashboard />}
    </DashboardLayout>
  );
}
