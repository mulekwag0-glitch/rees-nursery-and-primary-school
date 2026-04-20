import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess, ModuleKey, AccessLevel } from '@/hooks/useModuleAccess';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  module?: ModuleKey;
  /** Minimum access level required when a module override is set. Defaults to 'view'. */
  requiredAccess?: AccessLevel;
}

export function ProtectedRoute({ children, allowedRoles, module, requiredAccess = 'view' }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const { loading: accessLoading, access, can } = useModuleAccess();

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Module-level access overrides role checks (admins are always allowed via the hook).
  if (module && access[module] !== undefined && role !== 'admin') {
    if (!can(module, requiredAccess)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  }

  // Otherwise fall back to the role allow-list.
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
