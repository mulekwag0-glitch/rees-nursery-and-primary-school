import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

type AppRole = 'student' | 'tutor' | 'finance' | 'admin' | 'headmistress';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);

        // When auth state changes (login / token refresh / logout) re-resolve role.
        // Hold `loading` true until role is fetched so ProtectedRoute won't redirect mid-switch.
        if (session?.user) {
          setLoading(true);
          // Defer to avoid deadlocks inside the auth callback.
          setTimeout(() => {
            fetchUserRole(session.user.id).finally(() => {
              if (active) setLoading(false);
            });
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id).finally(() => {
          if (active) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (data && !error) {
        setRole(data.role as AppRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  // Auto-logout after 30 minutes of inactivity
  useSessionTimeout(!!user);

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
