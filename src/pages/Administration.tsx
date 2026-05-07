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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Star, Loader2, ShoppingCart, ExternalLink, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Administration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPtaDialog, setShowPtaDialog] = useState(false);
  const [showAppraisalDialog, setShowAppraisalDialog] = useState(false);

  // PTA form
  const [ptaDate, setPtaDate] = useState(new Date().toISOString().split('T')[0]);
  const [ptaTitle, setPtaTitle] = useState('');
  const [ptaAttendees, setPtaAttendees] = useState('');
  const [ptaMinutes, setPtaMinutes] = useState('');
  const [ptaResolutions, setPtaResolutions] = useState('');

  // Appraisal form
  const [appEmployee, setAppEmployee] = useState('');
  const [appPeriod, setAppPeriod] = useState('');
  const [appRating, setAppRating] = useState('3');
  const [appStrengths, setAppStrengths] = useState('');
  const [appImprovements, setAppImprovements] = useState('');
  const [appRecommendations, setAppRecommendations] = useState('');

  const { data: ptaMeetings = [], isLoading: loadingPta } = useQuery({
    queryKey: ['pta-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pta_meetings').select('*').order('meeting_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: appraisals = [], isLoading: loadingAppraisals } = useQuery({
    queryKey: ['staff-appraisals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_appraisals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const savePtaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pta_meetings').insert({
        meeting_date: ptaDate,
        title: ptaTitle,
        attendees_count: parseInt(ptaAttendees) || 0,
        minutes: ptaMinutes,
        resolutions: ptaResolutions,
        recorded_by: user?.id || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pta-meetings'] });
      toast({ title: 'PTA meeting saved' });
      setShowPtaDialog(false);
      setPtaTitle(''); setPtaAttendees(''); setPtaMinutes(''); setPtaResolutions('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const saveAppraisalMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('staff_appraisals').insert({
        employee_name: appEmployee,
        appraisal_period: appPeriod,
        rating: parseInt(appRating),
        strengths: appStrengths,
        improvements: appImprovements,
        recommendations: appRecommendations,
        appraised_by: user?.id || '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appraisals'] });
      toast({ title: 'Appraisal saved' });
      setShowAppraisalDialog(false);
      setAppEmployee(''); setAppPeriod(''); setAppRating('3'); setAppStrengths(''); setAppImprovements(''); setAppRecommendations('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Administration</h1>
          <p className="text-muted-foreground">PTA meetings, staff appraisals, and administrative functions</p>
        </div>

        <Tabs defaultValue="pta" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="pta" className="flex gap-2"><Users className="w-4 h-4" /><span>PTA</span></TabsTrigger>
            <TabsTrigger value="appraisal" className="flex gap-2"><Star className="w-4 h-4" /><span>Appraisal</span></TabsTrigger>
            <TabsTrigger value="pos" className="flex gap-2"><ShoppingCart className="w-4 h-4" /><span>POS</span></TabsTrigger>
          </TabsList>

          <TabsContent value="pta" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">PTA Meetings & Records</h2>
              <Button onClick={() => setShowPtaDialog(true)}><Plus className="w-4 h-4 mr-2" />Add Meeting</Button>
            </div>
            {loadingPta ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : ptaMeetings.length === 0 ? (
              <Card><CardContent className="pt-6"><div className="text-center py-12 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No PTA meetings recorded yet</p></div></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {ptaMeetings.map((m: any) => (
                  <Card key={m.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{m.title}</p>
                          <p className="text-sm text-muted-foreground">{m.meeting_date} • {m.attendees_count} attendees</p>
                          {m.minutes && <p className="text-sm mt-2 line-clamp-2">{m.minutes}</p>}
                        </div>
                        <Badge variant="secondary">PTA</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appraisal" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Staff Appraisals</h2>
              <Button onClick={() => setShowAppraisalDialog(true)}><Plus className="w-4 h-4 mr-2" />New Appraisal</Button>
            </div>
            {loadingAppraisals ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div> : appraisals.length === 0 ? (
              <Card><CardContent className="pt-6"><div className="text-center py-12 text-muted-foreground"><Star className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No appraisals recorded yet</p></div></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {appraisals.map((a: any) => (
                  <Card key={a.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{a.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{a.appraisal_period} • Rating: {a.rating}/5</p>
                        </div>
                        <Badge variant="secondary">⭐ {a.rating}/5</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showPtaDialog} onOpenChange={setShowPtaDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record PTA Meeting</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Meeting Date</Label><Input type="date" value={ptaDate} onChange={e => setPtaDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Title / Agenda</Label><Input value={ptaTitle} onChange={e => setPtaTitle(e.target.value)} placeholder="e.g. Term 1 General Meeting" /></div>
              <div className="space-y-2"><Label>Attendees Count</Label><Input type="number" value={ptaAttendees} onChange={e => setPtaAttendees(e.target.value)} placeholder="Number of parents present" /></div>
              <div className="space-y-2"><Label>Minutes / Notes</Label><Textarea value={ptaMinutes} onChange={e => setPtaMinutes(e.target.value)} placeholder="Meeting minutes and resolutions..." rows={5} /></div>
              <div className="space-y-2"><Label>Resolutions</Label><Textarea value={ptaResolutions} onChange={e => setPtaResolutions(e.target.value)} placeholder="Key decisions made..." rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPtaDialog(false)}>Cancel</Button>
              <Button onClick={() => savePtaMutation.mutate()} disabled={savePtaMutation.isPending || !ptaTitle}>
                {savePtaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAppraisalDialog} onOpenChange={setShowAppraisalDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Staff Appraisal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Staff Member</Label><Input value={appEmployee} onChange={e => setAppEmployee(e.target.value)} placeholder="Employee name" /></div>
              <div className="space-y-2"><Label>Appraisal Period</Label><Input value={appPeriod} onChange={e => setAppPeriod(e.target.value)} placeholder="e.g. Term 1 2025" /></div>
              <div className="space-y-2"><Label>Performance Rating (1-5)</Label><Input type="number" min={1} max={5} value={appRating} onChange={e => setAppRating(e.target.value)} /></div>
              <div className="space-y-2"><Label>Strengths</Label><Textarea value={appStrengths} onChange={e => setAppStrengths(e.target.value)} rows={3} /></div>
              <div className="space-y-2"><Label>Areas for Improvement</Label><Textarea value={appImprovements} onChange={e => setAppImprovements(e.target.value)} rows={3} /></div>
              <div className="space-y-2"><Label>Recommendations</Label><Textarea value={appRecommendations} onChange={e => setAppRecommendations(e.target.value)} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAppraisalDialog(false)}>Cancel</Button>
              <Button onClick={() => saveAppraisalMutation.mutate()} disabled={saveAppraisalMutation.isPending || !appEmployee}>
                {saveAppraisalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
