import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { logAudit } from '@/lib/audit';
import { ModuleAccessDialog } from '@/components/users/ModuleAccessDialog';
import {
  Settings as SettingsIcon, Building2, Bell, Shield, Database, Palette, KeyRound, Loader2, Users, ScrollText, Search, Clock,
  MoreHorizontal, User, UserCheck, UserX, Plus, Settings2,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// --- Change Password Card ---
function ChangePasswordCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user email found');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) { toast({ title: 'Error', description: 'Current password is incorrect', variant: 'destructive' }); return; }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await logAudit('password_change', 'auth', user.id);
      toast({ title: 'Success', description: 'Password updated successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update password', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
          <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Confirm New Password</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Update Password</Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Audit Logs Tab ---
const ACTION_COLORS: Record<string, string> = {
  student_admitted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  payment_recorded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  result_approved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  expense_created: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

function AuditLogsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
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
    profiles?.forEach(p => { map[p.id] = { name: p.full_name, email: p.email }; });
    return map;
  }, [profiles]);

  const actions = [...new Set(logs?.map(l => l.action) || [])];
  const filtered = logs?.filter(l => {
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    const matchSearch = !searchTerm || l.action.includes(searchTerm.toLowerCase()) ||
      profileMap[l.user_id || '']?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchAction && matchSearch;
  }) || [];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Table</th></tr></thead>
          <tbody>
            {filtered.slice(0, 100).map(log => (
              <tr key={log.id}>
                <td className="text-xs whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{new Date(log.created_at).toLocaleString()}</td>
                <td className="text-sm">{profileMap[log.user_id || '']?.name || 'System'}</td>
                <td><Badge className={ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}>{log.action.replace(/_/g, ' ')}</Badge></td>
                <td className="text-sm text-muted-foreground">{log.table_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- User Management Tab ---
function UserManagementTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [accessUser, setAccessUser] = useState<{ id: string; full_name: string } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('tutor');
  const [creating, setCreating] = useState(false);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data: profilesData, error } = await supabase.from('profiles').select('id, email, full_name, created_at');
      if (error) throw error;
      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
      const roleMap: Record<string, string> = {};
      rolesData?.forEach(r => { roleMap[r.user_id] = r.role; });
      return profilesData.map(p => ({ ...p, role: roleMap[p.id] || 'user' }));
    },
  });

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newFullName) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email: newEmail, password: newPassword, full_name: newFullName, role: newRole },
      });
      if (error) throw error;
      toast({ title: 'User created', description: `${newEmail} created with ${newRole} role` });
      setShowCreateDialog(false);
      setNewEmail(''); setNewPassword(''); setNewFullName(''); setNewRole('tutor');
      refetch();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke('reset-password', { body: { user_id: userId, new_password: 'Temp@123' } });
      if (error) throw error;
      toast({ title: 'Password Reset', description: `Temporary password for ${email}: Temp@123` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = users?.filter(u => {
    const q = searchTerm.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  }) || [];

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" />Add User</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td className="font-medium">{u.full_name}</td>
                <td className="text-sm">{u.email}</td>
                <td><Badge variant="secondary">{u.role}</Badge></td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setAccessUser({ id: u.id, full_name: u.full_name })}>
                        <Settings2 className="w-4 h-4 mr-2" />Module Access
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetPassword(u.id, u.email)}>
                        <KeyRound className="w-4 h-4 mr-2" />Reset Password
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle><DialogDescription>Create a new staff account</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={newFullName} onChange={e => setNewFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Role / Access Level</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                   <SelectItem value="headmistress">Headmistress (Academic Oversight)</SelectItem>
                   <SelectItem value="tutor">Teacher (Academic Access)</SelectItem>
                   <SelectItem value="finance">Bursar / Finance (Financial Access)</SelectItem>
                 </SelectContent>
               </Select>
               <p className="text-xs text-muted-foreground">
                 {newRole === 'admin' && 'Full system access: pupils, results, finance, HR, settings, user management.'}
                 {newRole === 'headmistress' && 'Academic oversight: view all pupils, results, attendance, approve results, generate report cards & certificates. No access to settings, user management, or financial data.'}
                 {newRole === 'tutor' && 'Can manage results, lesson plans, attendance, schemes of work for assigned classes.'}
                 {newRole === 'finance' && 'Can manage payments, fee structures, expenses, payroll, and financial reports.'}
               </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModuleAccessDialog
        open={!!accessUser}
        onOpenChange={(o) => { if (!o) setAccessUser(null); }}
        userId={accessUser?.id || null}
        userName={accessUser?.full_name}
      />
    </div>
  );
}

// --- Main Settings Page ---
export default function Settings() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration, users, and preferences</p>
        </div>

        <Tabs defaultValue={role === 'admin' ? 'general' : 'account'} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="account" className="flex gap-2"><KeyRound className="w-4 h-4" /><span className="hidden sm:inline">Account</span></TabsTrigger>
            {role === 'admin' && (
              <>
                <TabsTrigger value="general" className="flex gap-2"><Building2 className="w-4 h-4" /><span className="hidden sm:inline">General</span></TabsTrigger>
                <TabsTrigger value="academic" className="flex gap-2"><Database className="w-4 h-4" /><span className="hidden sm:inline">Academic</span></TabsTrigger>
                <TabsTrigger value="users" className="flex gap-2"><Users className="w-4 h-4" /><span className="hidden sm:inline">Users</span></TabsTrigger>
                <TabsTrigger value="audit" className="flex gap-2"><ScrollText className="w-4 h-4" /><span className="hidden sm:inline">Audit Logs</span></TabsTrigger>
                <TabsTrigger value="security" className="flex gap-2"><Shield className="w-4 h-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="account" className="mt-6"><ChangePasswordCard /></TabsContent>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Institution Information</CardTitle>
                <CardDescription>Permanent school details — locked by system policy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Institution Name</Label><Input value="Rees Daycare Nursery & Primary School" readOnly disabled /></div>
                  <div className="space-y-2"><Label>Short Name</Label><Input value="REES" readOnly disabled /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Email</Label><Input value="reesnursery@gmail.com" readOnly disabled /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value="0772379888 / 0706583860 / 0782063563" readOnly disabled /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input value="Mbale City, Uganda" readOnly disabled /></div>
                <p className="text-xs text-muted-foreground">These details are permanent and cannot be modified.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Grading Scale</CardTitle><CardDescription>Uganda New Curriculum competency ratings</CardDescription></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Rating</th><th>Label</th><th>Min Score</th><th>Max Score</th></tr></thead>
                    <tbody>
                      {[
                        { code: 'BE', label: 'Beyond Expectation', min: 80, max: 100 },
                        { code: 'AE', label: 'Above Expectation', min: 65, max: 79 },
                        { code: 'ME', label: 'Meeting Expectation', min: 50, max: 64 },
                        { code: 'BW', label: 'Below Expectation', min: 0, max: 49 },
                      ].map(r => (
                        <tr key={r.code}>
                          <td className="font-semibold">{r.code}</td>
                          <td>{r.label}</td>
                          <td><Input type="number" defaultValue={r.min} className="w-20" /></td>
                          <td><Input type="number" defaultValue={r.max} className="w-20" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button className="mt-4">Update Grading Scale</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6"><UserManagementTab /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditLogsTab /></TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Session Timeout</p><p className="text-sm text-muted-foreground">Auto logout after inactivity</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Audit Logging</p><p className="text-sm text-muted-foreground">Log all user actions</p></div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
