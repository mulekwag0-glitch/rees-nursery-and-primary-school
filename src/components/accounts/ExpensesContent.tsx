import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExpensesContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>Track and manage school expenses</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Use the dedicated Expenses page for full functionality.</p>
      </CardContent>
    </Card>
  );
}
