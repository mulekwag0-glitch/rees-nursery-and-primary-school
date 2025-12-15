import React from 'react';
import { StatCard } from './StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminDashboard() {
  const navigate = useNavigate();

  // Mock data - will be replaced with real data
  const stats = {
    totalStudents: 1247,
    activeStudents: 1180,
    totalCourses: 48,
    pendingResults: 12,
    totalRevenue: 'UGX 847M',
    collectionRate: 78,
  };

  const recentActivities = [
    { id: 1, action: 'New student registered', user: 'John Mukasa', time: '5 mins ago', type: 'student' },
    { id: 2, action: 'Results submitted for ICT101', user: 'Dr. Sarah Nambi', time: '15 mins ago', type: 'result' },
    { id: 3, action: 'Payment recorded', user: 'Finance Office', time: '1 hour ago', type: 'payment' },
    { id: 4, action: 'Course created: Database Systems', user: 'Admin', time: '2 hours ago', type: 'course' },
  ];

  const pendingApprovals = [
    { id: 1, course: 'ICT101 - Computer Fundamentals', students: 45, tutor: 'Dr. Sarah Nambi' },
    { id: 2, course: 'MTH102 - Mathematics II', students: 52, tutor: 'Mr. James Okello' },
    { id: 3, course: 'BUS201 - Business Communication', students: 38, tutor: 'Ms. Grace Namutebi' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/students')}>
            <Users className="w-4 h-4 mr-2" />
            Manage Students
          </Button>
          <Button onClick={() => navigate('/users')}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          subtitle={`${stats.activeStudents} active`}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Active Courses"
          value={stats.totalCourses}
          subtitle="This semester"
          icon={BookOpen}
          variant="secondary"
        />
        <StatCard
          title="Pending Results"
          value={stats.pendingResults}
          subtitle="Awaiting approval"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Revenue Collected"
          value={stats.totalRevenue}
          subtitle={`${stats.collectionRate}% collection rate`}
          icon={CreditCard}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Pending Result Approvals</CardTitle>
              <CardDescription>Results waiting for your review</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/results')}>
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.course}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.students} students • {item.tutor}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-8">
                      Review
                    </Button>
                  </div>
                </div>
              ))}
              {pendingApprovals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest actions in the system</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${
                    activity.type === 'student' ? 'bg-primary' :
                    activity.type === 'result' ? 'bg-secondary' :
                    activity.type === 'payment' ? 'bg-success' :
                    'bg-info'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/students')}>
              <Users className="w-5 h-5 text-primary" />
              <span>Add Student</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/courses')}>
              <BookOpen className="w-5 h-5 text-secondary" />
              <span>Create Course</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/semesters')}>
              <GraduationCap className="w-5 h-5 text-accent" />
              <span>Manage Semester</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reports')}>
              <TrendingUp className="w-5 h-5 text-info" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
