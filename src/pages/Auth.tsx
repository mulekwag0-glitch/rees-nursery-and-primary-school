import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Loader2, GraduationCap, Briefcase } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

function getLoginAttempts(): { count: number; lockedUntil: number | null } {
  try {
    const raw = sessionStorage.getItem('login_attempts');
    if (!raw) return { count: 0, lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

function setLoginAttempts(count: number, lockedUntil: number | null) {
  sessionStorage.setItem('login_attempts', JSON.stringify({ count, lockedUntil }));
}

function clearLoginAttempts() {
  sessionStorage.removeItem('login_attempts');
}

export default function Auth() {
  const { signIn, user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('student');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    const { lockedUntil } = getLoginAttempts();
    if (!lockedUntil) return;
    const remaining = lockedUntil - Date.now();
    if (remaining <= 0) { setLoginAttempts(0, null); return; }
    setLockoutRemaining(Math.ceil(remaining / 1000));
    const interval = setInterval(() => {
      const r = (lockedUntil - Date.now()) / 1000;
      if (r <= 0) { setLoginAttempts(0, null); setLockoutRemaining(0); clearInterval(interval); }
      else setLockoutRemaining(Math.ceil(r));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Role-based redirect after login
  useEffect(() => {
    if (user && !authLoading) {
      // If role is already available, redirect to role-specific page
      if (role) {
        const redirectPath = getRedirectPath(role);
        navigate(redirectPath, { replace: true });
      } else {
        // If no role yet, redirect to dashboard which handles role waiting
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, role, authLoading, navigate]);

  const getRedirectPath = (userRole: string): string => {
    switch (userRole) {
      case 'admin':
        return '/dashboard';
      case 'tutor':
        return '/results';
      case 'finance':
        return '/payments';
      case 'student':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check lockout
    const { count, lockedUntil } = getLoginAttempts();
    if (lockedUntil && Date.now() < lockedUntil) {
      toast({ title: 'Account Temporarily Locked', description: `Too many failed attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)}s.`, variant: 'destructive' });
      return;
    }

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.errors[0].message, variant: 'destructive' });
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      const newCount = count + 1;
      if (newCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLoginAttempts(newCount, until);
        setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        // Start countdown
        const interval = setInterval(() => {
          const r = (until - Date.now()) / 1000;
          if (r <= 0) { setLoginAttempts(0, null); setLockoutRemaining(0); clearInterval(interval); }
          else setLockoutRemaining(Math.ceil(r));
        }, 1000);
        toast({ title: 'Account Temporarily Locked', description: `Too many failed attempts. Try again in 2 minutes.`, variant: 'destructive' });
      } else {
        setLoginAttempts(newCount, null);
        const remaining = MAX_ATTEMPTS - newCount;
        toast({
          title: 'Login Failed',
          description: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          variant: 'destructive',
        });
      }
    } else {
      clearLoginAttempts();
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
    }
  };

  const LoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder="your@email.com"
            className="pl-10"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            required
          />
        </div>
      </div>
      {lockoutRemaining > 0 && (
        <p className="text-sm text-center text-destructive font-medium">
          Too many failed attempts. Try again in {lockoutRemaining}s
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading || lockoutRemaining > 0}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : lockoutRemaining > 0 ? (
          `Locked (${lockoutRemaining}s)`
        ) : (
          'Sign In'
        )}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Contact your administrator if you need an account
      </p>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Salem Uganda</h1>
          <p className="text-muted-foreground">Institution Management System</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription>
              Select your portal to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Student Portal
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Staff Portal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="space-y-4">
                <div className="text-center mb-4 p-3 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">
                    Access your results, payments, and academic information
                  </p>
                </div>
                <LoginForm />
              </TabsContent>

              <TabsContent value="staff" className="space-y-4">
                <div className="text-center mb-4 p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">
                    For Tutors, Finance Officers, and Administrators
                  </p>
                </div>
                <LoginForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © {new Date().getFullYear()} Salem Uganda. All rights reserved.
        </p>
      </div>
    </div>
  );
}