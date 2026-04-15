import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Receipt, DollarSign } from 'lucide-react';
import PaymentsContent from '@/components/accounts/PaymentsContent';
import FeeStructuresContent from '@/components/accounts/FeeStructuresContent';
import ExpensesContent from '@/components/accounts/ExpensesContent';

export default function Accounts() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Manage payments, fee structures, and expenses</p>
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="payments" className="flex gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Fee Structures</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex gap-2">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-6">
            <PaymentsContent />
          </TabsContent>
          <TabsContent value="fees" className="mt-6">
            <FeeStructuresContent />
          </TabsContent>
          <TabsContent value="expenses" className="mt-6">
            <ExpensesContent />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
