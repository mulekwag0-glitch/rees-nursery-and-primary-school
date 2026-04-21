import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Loader2, Phone, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { EditPupilDialog } from '@/components/students/EditPupilDialog';

export default function Students() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { can } = useModuleAccess();
  const canEdit = can('pupils', 'edit', role === 'admin' ? 'full' : 'view');
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name, code').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, full_name, gender, status, parent_contact, enrollment_date, program_id, programs(name, code)')
        .order('student_id');
      if (error) throw error;
      return data;
    },
  });

  const filtered = students.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.parent_contact?.includes(q);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchClass = classFilter === 'all' || s.program_id === classFilter;
    return matchSearch && matchStatus && matchClass;
  });

  const activeCount = students.filter(s => s.status === 'active').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pupils</h1>
            <p className="text-muted-foreground">{students.length} total • {activeCount} active</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => navigate('/admissions')}>
                <Users className="w-4 h-4 mr-2" /> Admit New Pupil
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name, reg no, or parent phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pupils List</CardTitle>
              <Badge variant="secondary">{filtered.length} pupils</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Class</th>
                      <th>Parent Contact</th>
                      <th>Status</th>
                      {canEdit && <th className="text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id}>
                        <td className="font-mono text-sm">{s.student_id}</td>
                        <td className="font-medium">{s.full_name}</td>
                        <td className="text-sm">{s.gender}</td>
                        <td><Badge variant="secondary">{(s as any).programs?.name}</Badge></td>
                        <td className="text-sm">
                          {s.parent_contact && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />{s.parent_contact}
                            </span>
                          )}
                        </td>
                        <td>
                          <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                        </td>
                        {canEdit && (
                          <td className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => setEditTarget(s)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <EditPupilDialog
          pupil={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
        />
      </div>
    </DashboardLayout>
  );
}
