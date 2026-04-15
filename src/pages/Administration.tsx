import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, ClipboardList, Star } from 'lucide-react';

export default function Administration() {
  const { toast } = useToast();
  const [showPtaDialog, setShowPtaDialog] = useState(false);
  const [showAppraisalDialog, setShowAppraisalDialog] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-muted-foreground">PTA meetings, staff appraisals, and administrative functions</p>
        </div>

        <Tabs defaultValue="pta" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="pta" className="flex gap-2"><Users className="w-4 h-4" /><span>PTA</span></TabsTrigger>
            <TabsTrigger value="appraisal" className="flex gap-2"><Star className="w-4 h-4" /><span>Appraisal</span></TabsTrigger>
          </TabsList>

          <TabsContent value="pta" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">PTA Meetings & Records</h2>
              <Button onClick={() => setShowPtaDialog(true)}><Plus className="w-4 h-4 mr-2" />Add Meeting</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No PTA meetings recorded yet</p>
                  <p className="text-sm">Record your first PTA meeting</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appraisal" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Staff Appraisals</h2>
              <Button onClick={() => setShowAppraisalDialog(true)}><Plus className="w-4 h-4 mr-2" />New Appraisal</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No appraisals recorded yet</p>
                  <p className="text-sm">Create your first staff appraisal</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* PTA Dialog */}
        <Dialog open={showPtaDialog} onOpenChange={setShowPtaDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record PTA Meeting</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Meeting Date</Label><Input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
              <div className="space-y-2"><Label>Title / Agenda</Label><Input placeholder="e.g. Term 1 General Meeting" /></div>
              <div className="space-y-2"><Label>Attendees Count</Label><Input type="number" placeholder="Number of parents present" /></div>
              <div className="space-y-2"><Label>Minutes / Notes</Label><Textarea placeholder="Meeting minutes and resolutions..." rows={5} /></div>
              <div className="space-y-2"><Label>Resolutions</Label><Textarea placeholder="Key decisions made..." rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPtaDialog(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'PTA meeting saved' }); setShowPtaDialog(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Appraisal Dialog */}
        <Dialog open={showAppraisalDialog} onOpenChange={setShowAppraisalDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Staff Appraisal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Staff Member</Label><Input placeholder="Employee name" /></div>
              <div className="space-y-2"><Label>Appraisal Period</Label><Input placeholder="e.g. Term 1 2025" /></div>
              <div className="space-y-2"><Label>Performance Rating (1-5)</Label><Input type="number" min={1} max={5} placeholder="1-5" /></div>
              <div className="space-y-2"><Label>Strengths</Label><Textarea placeholder="Notable strengths..." rows={3} /></div>
              <div className="space-y-2"><Label>Areas for Improvement</Label><Textarea placeholder="Areas to improve..." rows={3} /></div>
              <div className="space-y-2"><Label>Recommendations</Label><Textarea placeholder="Actions and recommendations..." rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAppraisalDialog(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'Appraisal saved' }); setShowAppraisalDialog(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
