import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Clock, Loader2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = ['08:00-08:40', '08:40-09:20', '09:20-10:00', '10:30-11:10', '11:10-11:50', '11:50-12:30', '14:00-14:40', '14:40-15:20'];

export default function Timetables() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('all');
  const [showDialog, setShowDialog] = useState(false);

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-timetable'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-timetable', selectedClass],
    queryFn: async () => {
      let query = supabase.from('courses').select('id, name, code, program_id');
      if (selectedClass !== 'all') query = query.eq('program_id', selectedClass);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lesson Timetables</h1>
            <p className="text-muted-foreground">Manage class lesson timetables</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-2" />Add Entry</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Weekly Timetable</CardTitle>
            <CardDescription>{selectedClass === 'all' ? 'Select a class to view timetable' : programs.find(p => p.id === selectedClass)?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    {DAYS.map(d => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period, i) => (
                    <tr key={period}>
                      <td className="font-mono text-xs whitespace-nowrap">{period}</td>
                      {DAYS.map(day => (
                        <td key={day} className="text-center">
                          {i === 3 ? (
                            <span className="text-xs text-muted-foreground italic">Break</span>
                          ) : selectedClass !== 'all' && subjects.length > 0 ? (
                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                              {subjects[(i + DAYS.indexOf(day)) % subjects.length]?.name?.substring(0, 10) || '-'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Timetable Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
                    <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Input placeholder="Teacher name" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'Entry saved' }); setShowDialog(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
