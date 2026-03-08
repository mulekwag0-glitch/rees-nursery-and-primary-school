import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Shield, Clock } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  student_admitted: 'bg-success/20 text-success',
  payment_recorded: 'bg-primary/20 text-primary',
  result_approved: 'bg-warning/20 text-warning',
  expense_created: 'bg-secondary/80 text-secondary-foreground',
  expense_approved: 'bg-success/20 text-success',
  expense_deleted: 'bg-destructive/20 text-destructive',
  payroll_created: 'bg-primary/20 text-primary',
  payroll_approved: 'bg-success/20 text-success',
};

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['audit-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email');
      if (error) throw error;
      return data;
    },
  });

  const profileMap = React.useMemo(() => {
    const map: Record<string, { name: string; email: string }> = {};
    profiles?.forEach((p) => { map[p.id] = { name: p.full_name, email: p.email }; });
    return map;
  }, [profiles]);

  const actions = React.useMemo(() => {
    const set = new Set<string>();
    logs?.forEach((l: any) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = logs?.filter((l: any) => {
    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    const user = profileMap[l.user_id];
    const matchesSearch = searchTerm === '' ||
      l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6" /> Audit Logs
          </h1>
          <p className="text-muted-foreground">Track all administrative actions and system events</p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold">{logs?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold">{actions.length}</p>
              <p className="text-xs text-muted-foreground">Action Types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-medium">
                {logs?.[0] ? formatDate(logs[0].created_at) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Latest Entry</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by action, table, or user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !filtered?.length ? (
              <p className="text-center text-muted-foreground py-8">No audit logs found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Table</th>
                      <th>User</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l: any) => {
                      const user = profileMap[l.user_id];
                      return (
                        <tr key={l.id}>
                          <td className="text-sm whitespace-nowrap">{formatDate(l.created_at)}</td>
                          <td>
                            <Badge variant="secondary" className={`border-0 capitalize ${ACTION_COLORS[l.action] || ''}`}>
                              {l.action?.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="text-sm font-mono text-muted-foreground">{l.table_name || '—'}</td>
                          <td>
                            {user ? (
                              <div>
                                <div className="text-sm font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">{l.user_id?.slice(0, 8) || 'System'}</span>
                            )}
                          </td>
                          <td className="max-w-[300px]">
                            {l.new_data ? (
                              <details className="cursor-pointer">
                                <summary className="text-xs text-muted-foreground">View data</summary>
                                <pre className="text-xs mt-1 p-2 rounded bg-muted overflow-auto max-h-32">
                                  {JSON.stringify(l.new_data, null, 2)}
                                </pre>
                              </details>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
