import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PaymentFormModal } from '@/components/payments/PaymentFormModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  Download,
  Receipt,
  Wallet,
  TrendingUp,
  Loader2,
} from 'lucide-react';

function FinancePaymentsView() {
  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ['all-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          students:student_id (
            student_id,
            profiles:user_id (full_name)
          ),
          semesters:semester_id (name)
        `)
        .order('payment_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', today);

      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', monthStart);

      return {
        today: todayPayments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
        month: monthPayments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-success text-success-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Today's Collection</p>
                <p className="text-2xl font-bold">UGX {(stats?.today || 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">This Month</p>
                <p className="text-2xl font-bold">UGX {(stats?.month || 0).toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning text-warning-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Outstanding</p>
                <p className="text-2xl font-bold">-</p>
              </div>
              <CreditCard className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary text-secondary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Transactions</p>
                <p className="text-2xl font-bold">{payments?.length || 0}</p>
              </div>
              <Receipt className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by student ID, name, or receipt..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <PaymentFormModal onSuccess={refetch} />
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Payments</CardTitle>
          <CardDescription>All payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Receipt</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments?.map((payment: any) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="font-mono text-sm">{payment.students?.student_id}</td>
                      <td className="font-medium">{payment.students?.profiles?.full_name || '-'}</td>
                      <td className="font-semibold text-success">
                        UGX {parseFloat(payment.amount).toLocaleString()}
                      </td>
                      <td>
                        <Badge variant="secondary" className="capitalize">
                          {payment.payment_method?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="font-mono text-sm">{payment.receipt_number}</td>
                      <td className="text-right">
                        <Button variant="ghost" size="sm">
                          <Receipt className="w-4 h-4 mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentPaymentsView() {
  const { user } = useAuth();

  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-payments', user?.id],
    queryFn: async () => {
      // Get student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          program_id,
          programs:program_id (name)
        `)
        .eq('user_id', user?.id || '')
        .maybeSingle();

      if (studentError || !student) return null;

      // Get payments
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          *,
          semesters:semester_id (name)
        `)
        .eq('student_id', student.id)
        .order('payment_date', { ascending: false });

      // Get fee structure
      const { data: feeStructure } = await supabase
        .from('fee_structures')
        .select('total_fee')
        .eq('program_id', student.program_id)
        .maybeSingle();

      const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount as any), 0) || 0;
      const totalFee = feeStructure?.total_fee || 0;
      const balance = totalFee - totalPaid;
      const percentage = totalFee > 0 ? Math.min(100, (totalPaid / totalFee) * 100) : 0;

      return { payments, totalFee, totalPaid, balance, percentage };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm opacity-80">Total Fees</p>
              <p className="text-2xl font-bold">
                UGX {(studentData?.totalFee || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80">Amount Paid</p>
              <p className="text-2xl font-bold">
                UGX {(studentData?.totalPaid || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80">Balance Due</p>
              <p className="text-2xl font-bold">
                UGX {(studentData?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Payment Progress</span>
              <span>{Math.round(studentData?.percentage || 0)}%</span>
            </div>
            <Progress value={studentData?.percentage || 0} className="h-2 bg-primary-foreground/20" />
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payment History</CardTitle>
            <CardDescription>Your payment transactions</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Statement
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {studentData?.payments?.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:shadow-soft transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">
                      UGX {parseFloat(payment.amount).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString()} •{' '}
                      {payment.semesters?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="capitalize">
                    {payment.payment_method?.replace('_', ' ')}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{payment.receipt_number}</p>
                </div>
              </div>
            ))}
            {!studentData?.payments?.length && (
              <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Payments() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">
            {role === 'student'
              ? 'View your payment history and balance'
              : 'Manage student payments and fees'}
          </p>
        </div>

        {/* Role-specific view */}
        {(role === 'finance' || role === 'admin') && <FinancePaymentsView />}
        {role === 'student' && <StudentPaymentsView />}
      </div>
    </DashboardLayout>
  );
}