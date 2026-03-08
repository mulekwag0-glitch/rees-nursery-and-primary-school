import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['hsl(222, 65%, 25%)', 'hsl(173, 58%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(280, 65%, 50%)', 'hsl(25, 95%, 53%)'];

export function ExpenseReports() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-expenses'],
    queryFn: async () => {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('amount, expense_date, category, status')
        .order('expense_date');
      if (error) throw error;

      const monthlyMap: Record<string, number> = {};
      const categoryMap: Record<string, number> = {};

      expenses?.forEach((e: any) => {
        const month = new Date(e.expense_date).toLocaleDateString('en', { month: 'short', year: '2-digit' });
        monthlyMap[month] = (monthlyMap[month] || 0) + parseFloat(e.amount);
        const cat = (e.category || 'general').replace('_', ' ');
        categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(e.amount);
      });

      return {
        monthly: Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })),
        categories: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
        total: expenses?.reduce((s, e) => s + parseFloat(e.amount as any), 0) || 0,
        approved: expenses?.filter((e: any) => e.status === 'approved').reduce((s, e) => s + parseFloat(e.amount as any), 0) || 0,
        count: expenses?.length || 0,
      };
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">UGX {(data?.total || 0).toLocaleString()}</p>
            <p className="text-sm opacity-80">Total Expenses</p>
          </CardContent>
        </Card>
        <Card className="bg-success text-success-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">UGX {(data?.approved || 0).toLocaleString()}</p>
            <p className="text-sm opacity-80">Approved</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary text-secondary-foreground">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{data?.count}</p>
            <p className="text-sm opacity-80">Total Records</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly Expense Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => `UGX ${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data?.categories} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {data?.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `UGX ${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
