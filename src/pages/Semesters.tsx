import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Lock, Unlock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Semesters() {
  const { toast } = useToast();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin';

  const { data: years, isLoading } = useQuery({
    queryKey: ['academic-years-with-terms'],
    queryFn: async () => {
      const { data: yrs, error: yErr } = await supabase
        .from('academic_years')
        .select('id, name, is_current, start_date, end_date')
        .order('start_date', { ascending: false });
      if (yErr) throw yErr;

      const { data: terms, error: tErr } = await supabase
        .from('semesters')
        .select('id, name, semester_number, is_current, results_open, start_date, end_date, academic_year_id')
        .order('semester_number');
      if (tErr) throw tErr;

      return (yrs || []).map((y) => ({
        ...y,
        terms: (terms || []).filter((t) => t.academic_year_id === y.id),
      }));
    },
  });

  const toggleResults = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from('semesters').update({ results_open: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years-with-terms'] });
      toast({ title: 'Updated', description: 'Term settings saved.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Calendar</h1>
          <p className="text-muted-foreground">Manage academic years and school terms</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !years?.length ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No academic years configured</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {years.map((year: any) => (
              <Card key={year.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      year.is_current ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Academic Year {year.name}</CardTitle>
                      {year.is_current && (
                        <Badge className="bg-success/20 text-success border-0 mt-1">Current Year</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {year.terms.map((term: any) => (
                      <div key={term.id} className={`p-4 rounded-lg border-2 ${term.is_current ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{term.name}</h4>
                            {term.is_current && <Badge className="bg-primary/20 text-primary border-0 text-xs">Active</Badge>}
                          </div>
                          {term.results_open ? <Unlock className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Start</span><span className="text-foreground">{term.start_date}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>End</span><span className="text-foreground">{term.end_date}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Results Entry Open</span>
                            <Switch
                              checked={!!term.results_open}
                              disabled={!isAdmin || toggleResults.isPending}
                              onCheckedChange={(v) => toggleResults.mutate({ id: term.id, value: v })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
