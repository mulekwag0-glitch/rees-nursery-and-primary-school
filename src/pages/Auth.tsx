import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, User, Loader2, GraduationCap, Briefcase } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('student');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signupSchema.parse({
        fullName: signupName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setLoading(false);

    if (error) {
      toast({
        title: 'Signup Failed',
        description: error.message.includes('already registered')
          ? 'This email is already registered. Please login instead.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created!',
        description: 'Your account has been created. Please contact an administrator to assign your role.',
      });
      setIsSignup(false);
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Don't have an account?{' '}
        <button type="button" onClick={() => setIsSignup(true)} className="text-primary hover:underline">
          Register here
        </button>
      </p>
    </form>
  );

  const SignupForm = () => (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            className="pl-10"
            value={signupName}
            onChange={(e) => setSignupName(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="your@email.com"
            className="pl-10"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-confirm"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            value={signupConfirmPassword}
            onChange={(e) => setSignupConfirmPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={() => setIsSignup(false)} className="text-primary hover:underline">
          Sign in
        </button>
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
                {isSignup ? <SignupForm /> : <LoginForm />}
              </TabsContent>

              <TabsContent value="staff" className="space-y-4">
                <div className="text-center mb-4 p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm text-muted-foreground">
                    For Tutors, Finance Officers, and Administrators
                  </p>
                </div>
                {isSignup ? <SignupForm /> : <LoginForm />}
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