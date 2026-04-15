import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAudit } from '@/lib/audit';
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Database,
  Palette,
  KeyRound,
  Loader2,
} from 'lucide-react';

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
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user email found');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({ title: 'Error', description: 'Current password is incorrect', variant: 'destructive' });
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await logAudit('password_change', 'auth', user.id);

      toast({ title: 'Success', description: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          Change Password
        </CardTitle>
        <CardDescription>Update your account password. Use this to change your temporary password after admission.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="Enter current password" />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Enter new password (min 6 chars)" />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Re-enter new password" />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and preferences</p>
        </div>

        <Tabs defaultValue={role === 'student' ? 'account' : 'general'} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
            <TabsTrigger value="account" className="flex gap-2">
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            {(role === 'admin') && (
              <>
                <TabsTrigger value="general" className="flex gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="academic" className="flex gap-2">
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline">Academic</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex gap-2">
                  <Palette className="w-4 h-4" />
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="account" className="mt-6 space-y-6">
            <ChangePasswordCard />
          </TabsContent>

          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Institution Information</CardTitle>
                <CardDescription>Basic details about your institution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Institution Name</Label>
                    <Input defaultValue="Rees Daycare Nursery & Primary School" />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Name / Code</Label>
                    <Input defaultValue="REES" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" defaultValue="admin@rees.ac.ug" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input defaultValue="+256780306692" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input defaultValue="Mbale City, Uganda" />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Grading Scale</CardTitle>
                <CardDescription>Configure the grading scale for results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Grade</th>
                        <th>Min Marks</th>
                        <th>Max Marks</th>
                        <th>Grade Point</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { grade: 'A', min: 70, max: 100, gp: 5 },
                        { grade: 'B', min: 60, max: 69, gp: 4 },
                        { grade: 'C', min: 50, max: 59, gp: 3 },
                        { grade: 'D', min: 45, max: 49, gp: 2 },
                        { grade: 'F', min: 0, max: 44, gp: 0 },
                      ].map((row) => (
                        <tr key={row.grade}>
                          <td className="font-semibold">{row.grade}</td>
                          <td><Input type="number" defaultValue={row.min} className="w-20" /></td>
                          <td><Input type="number" defaultValue={row.max} className="w-20" /></td>
                          <td><Input type="number" defaultValue={row.gp} className="w-20" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button className="mt-4">Update Grading Scale</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Configure email notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Result Submission Alerts</p>
                    <p className="text-sm text-muted-foreground">Notify admin when results are submitted</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Confirmations</p>
                    <p className="text-sm text-muted-foreground">Send receipts to students after payment</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New User Notifications</p>
                    <p className="text-sm text-muted-foreground">Notify admin when new users register</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Configure security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Require 2FA for all admin users</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Audit Logging</p>
                    <p className="text-sm text-muted-foreground">Log all user actions for compliance</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Theme customization options coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
