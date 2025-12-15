import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  Search,
  Plus,
  Download,
  Receipt,
  Wallet,
  TrendingUp,
} from 'lucide-react';

// Mock data for finance/admin view
const allPayments = [
  { id: 1, date: '2024-01-15', studentId: 'STU2024001', name: 'John Mukasa', amount: 1200000, method: 'Bank Transfer', receipt: 'RCP001245' },
  { id: 2, date: '2024-01-14', studentId: 'STU2024002', name: 'Sarah Nambi', amount: 800000, method: 'Mobile Money', receipt: 'RCP001244' },
  { id: 3, date: '2024-01-13', studentId: 'STU2024003', name: 'James Okello', amount: 1500000, method: 'Cash', receipt: 'RCP001243' },
  { id: 4, date: '2024-01-12', studentId: 'STU2024004', name: 'Grace Namutebi', amount: 600000, method: 'Bank Transfer', receipt: 'RCP001242' },
];

// Mock data for student view
const studentPayments = [
  { id: 1, date: '2024-01-15', amount: 1200000, method: 'Bank Transfer', receipt: 'RCP001245', semester: 'Sem 1, 2024/2025' },
  { id: 2, date: '2023-09-01', amount: 1200000, method: 'Mobile Money', receipt: 'RCP000987', semester: 'Sem 2, 2023/2024' },
  { id: 3, date: '2023-02-15', amount: 1000000, method: 'Cash', receipt: 'RCP000654', semester: 'Sem 1, 2023/2024' },
];

function FinancePaymentsView() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-success text-success-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Today's Collection</p>
                <p className="text-2xl font-bold">UGX 12.4M</p>
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
                <p className="text-2xl font-bold">UGX 847M</p>
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
                <p className="text-2xl font-bold">UGX 285M</p>
              </div>
              <CreditCard className="w-8 h-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary text-secondary-foreground">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Collection Rate</p>
                <p className="text-2xl font-bold">75%</p>
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
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
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
                {allPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.date}</td>
                    <td className="font-mono text-sm">{payment.studentId}</td>
                    <td className="font-medium">{payment.name}</td>
                    <td className="font-semibold text-success">UGX {payment.amount.toLocaleString()}</td>
                    <td>
                      <Badge variant="secondary">{payment.method}</Badge>
                    </td>
                    <td className="font-mono text-sm">{payment.receipt}</td>
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
        </CardContent>
      </Card>
    </div>
  );
}

function StudentPaymentsView() {
  const paymentSummary = {
    totalFee: 2400000,
    paid: 1800000,
    balance: 600000,
    percentage: 75,
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm opacity-80">Total Fees</p>
              <p className="text-2xl font-bold">UGX {paymentSummary.totalFee.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Amount Paid</p>
              <p className="text-2xl font-bold">UGX {paymentSummary.paid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Balance Due</p>
              <p className="text-2xl font-bold">UGX {paymentSummary.balance.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Payment Progress</span>
              <span>{paymentSummary.percentage}%</span>
            </div>
            <Progress value={paymentSummary.percentage} className="h-2 bg-primary-foreground/20" />
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
            {studentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-soft transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">UGX {payment.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{payment.date} • {payment.semester}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">{payment.method}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{payment.receipt}</p>
                </div>
              </div>
            ))}
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
            {role === 'student' ? 'View your payment history and balance' : 'Manage student payments and fees'}
          </p>
        </div>

        {/* Role-specific view */}
        {(role === 'finance' || role === 'admin') && <FinancePaymentsView />}
        {role === 'student' && <StudentPaymentsView />}
      </div>
    </DashboardLayout>
  );
}
