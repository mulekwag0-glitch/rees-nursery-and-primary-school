import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FeeStructuresContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Structures</CardTitle>
        <CardDescription>Set up tuition and other fees per class and term</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Use the dedicated Fee Structures page for full functionality.</p>
      </CardContent>
    </Card>
  );
}
