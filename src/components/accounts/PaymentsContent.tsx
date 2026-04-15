import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Re-export the payments page content without the layout wrapper
// For now, a simple placeholder that imports the real logic
export default function PaymentsContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
        <CardDescription>View and record pupil payments</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Use the dedicated Payments page for full functionality. This tab provides a quick overview.</p>
      </CardContent>
    </Card>
  );
}
