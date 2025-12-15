import React from 'react';
import { StatCard } from './StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  TrendingUp,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FinanceDashboard() {
  const navigate = useNavigate();

  // Mock data
  const stats = {
    totalCollected: 'UGX 847,500,000',
    outstanding: 'UGX 285,000,000',
    todayPayments: 'UGX 12,450,000',
    studentsWithBalance: 456,
  };

  const recentPayments = [
    { id: 1, student: 'John Mukasa', studentId: 'STU2024001', amount: 'UGX 1,200,000', date: 'Today, 10:30 AM', semester: 'Sem 1' },
    { id: 2, student: 'Sarah Nambi', studentId: 'STU2024015', amount: 'UGX 800,000', date: 'Today, 9:15 AM', semester: 'Sem 1' },
    { id: 3, student: 'James Okello', studentId: 'STU2024023', amount: 'UGX 1,500,000', date: 'Yesterday', semester: 'Sem 1' },
    { id: 4, student: 'Grace Namutebi', studentId: 'STU2024008', amount: 'UGX 600,000', date: 'Yesterday', semester: 'Sem 1' },
  ];

  const studentsWithBalances = [
    { id: 1, name: 'Peter Ssali', studentId: 'STU2024045', balance: 'UGX 450,000', status: 'overdue' },
    { id: 2, name: 'Mary Achieng', studentId: 'STU2024067', balance: 'UGX 320,000', status: 'pending' },
    { id: 3, name: 'David Ouma', studentId: 'STU2024089', balance: 'UGX 780,000', status: 'overdue' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-muted-foreground">Manage student payments and generate reports.</p>
        </div>
        <Button onClick={() => navigate('/payments')}>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Collected"
          value={stats.totalCollected}
          subtitle="This semester"
          icon={CreditCard}
          variant="success"
        />
        <StatCard
          title="Outstanding Balance"
          value={stats.outstanding}
          subtitle="Across all students"
          icon={Wallet}
          variant="warning"
        />
        <StatCard
          title="Today's Payments"
          value={stats.todayPayments}
          subtitle="5 transactions"
          icon={TrendingUp}
          variant="info"
        />
        <StatCard
          title="Students with Balance"
          value={stats.studentsWithBalance}
          subtitle="Need follow-up"
          icon={Users}
          variant="primary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{payment.student}</p>
                      <p className="text-xs text-muted-foreground">{payment.studentId} • {payment.semester}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">{payment.amount}</p>
                    <p className="text-xs text-muted-foreground">{payment.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Outstanding Balances</CardTitle>
              <CardDescription>Students requiring follow-up</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
              Full Report
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {studentsWithBalances.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:shadow-soft transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      student.status === 'overdue' ? 'bg-destructive/20' : 'bg-warning/20'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        student.status === 'overdue' ? 'text-destructive' : 'text-warning'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{student.balance}</p>
                    <Badge variant={student.status === 'overdue' ? 'destructive' : 'secondary'} className="text-xs">
                      {student.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </Badge>
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
          <CardDescription>Common finance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/payments')}>
              <Plus className="w-5 h-5 text-success" />
              <span>Record Payment</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/students')}>
              <Users className="w-5 h-5 text-primary" />
              <span>View Students</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reports')}>
              <TrendingUp className="w-5 h-5 text-info" />
              <span>Generate Report</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Receipt className="w-5 h-5 text-accent" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
