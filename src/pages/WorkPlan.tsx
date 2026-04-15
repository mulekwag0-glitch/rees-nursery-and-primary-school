import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, DollarSign, ClipboardList } from 'lucide-react';

export default function WorkPlan() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'workplan' | 'budget'>('workplan');

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Work Plan & Budget</h1>
          <p className="text-muted-foreground">School work plans and budget management</p>
        </div>

        <Tabs defaultValue="workplan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="workplan" className="flex gap-2"><ClipboardList className="w-4 h-4" /><span>Work Plan</span></TabsTrigger>
            <TabsTrigger value="budget" className="flex gap-2"><DollarSign className="w-4 h-4" /><span>Budget</span></TabsTrigger>
          </TabsList>

          <TabsContent value="workplan" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Term Work Plans</h2>
              <Button onClick={() => { setDialogType('workplan'); setShowDialog(true); }}><Plus className="w-4 h-4 mr-2" />Add Plan</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No work plans created yet</p>
                  <p className="text-sm">Create term-based work plans for the school</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">School Budget</h2>
              <Button onClick={() => { setDialogType('budget'); setShowDialog(true); }}><Plus className="w-4 h-4 mr-2" />Add Budget Item</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No budget items created yet</p>
                  <p className="text-sm">Set up the school budget per term</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{dialogType === 'workplan' ? 'Add Work Plan' : 'Add Budget Item'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {dialogType === 'workplan' ? (
                <>
                  <div className="space-y-2"><Label>Term</Label><Input placeholder="e.g. Term 1 2025" /></div>
                  <div className="space-y-2"><Label>Activity</Label><Input placeholder="e.g. Mid-term exams" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" /></div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" /></div>
                  </div>
                  <div className="space-y-2"><Label>Responsible Person</Label><Input placeholder="e.g. Head Teacher" /></div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} /></div>
                </>
              ) : (
                <>
                  <div className="space-y-2"><Label>Budget Category</Label><Input placeholder="e.g. Teaching Materials" /></div>
                  <div className="space-y-2"><Label>Term</Label><Input placeholder="e.g. Term 1 2025" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Budgeted Amount (UGX)</Label><Input type="number" placeholder="0" /></div>
                    <div className="space-y-2"><Label>Actual Spent (UGX)</Label><Input type="number" placeholder="0" /></div>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Textarea rows={2} /></div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'Saved' }); setShowDialog(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
