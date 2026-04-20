import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AccessLevel = 'none' | 'view' | 'edit' | 'full';

// Map app routes / sidebar entries to a module key stored in user_module_access.
export const MODULE_KEYS = {
  dashboard: 'dashboard',
  pupils: 'pupils',
  admissions: 'admissions',
  enrollments: 'enrollments',
  attendance: 'attendance',
  structures: 'structures',
  tutor_assignments: 'tutor_assignments',
  results: 'results',
  report_cards: 'report_cards',
  certificates: 'certificates',
  payments: 'payments',
  expenses: 'expenses',
  hr: 'hr',
  administration: 'administration',
  classes: 'classes',
  terms: 'terms',
  reports: 'reports',
  settings: 'settings',
} as const;

export type ModuleKey = typeof MODULE_KEYS[keyof typeof MODULE_KEYS];

interface ModuleAccessState {
  loading: boolean;
  access: Record<string, AccessLevel>;
  /** Returns the user's access level for a module. Admin always 'full'. If no row exists, falls back to role-based default. */
  getAccess: (module: ModuleKey, fallback?: AccessLevel) => AccessLevel;
  can: (module: ModuleKey, required: AccessLevel, fallback?: AccessLevel) => boolean;
}

const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, full: 3 };

export function useModuleAccess(): ModuleAccessState {
  const { user, role } = useAuth();
  const [access, setAccess] = useState<Record<string, AccessLevel>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setAccess({}); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_module_access')
        .select('module, access_level')
        .eq('user_id', user.id);
      const map: Record<string, AccessLevel> = {};
      (data || []).forEach((r: any) => { map[r.module] = (r.access_level || 'none') as AccessLevel; });
      setAccess(map);
      setLoading(false);
    })();
  }, [user]);

  const getAccess = (module: ModuleKey, fallback: AccessLevel = 'none'): AccessLevel => {
    if (role === 'admin') return 'full';
    // Explicit override always wins
    if (access[module] !== undefined) return access[module];
    return fallback;
  };

  const can = (module: ModuleKey, required: AccessLevel, fallback: AccessLevel = 'none') =>
    LEVEL_RANK[getAccess(module, fallback)] >= LEVEL_RANK[required];

  return { loading, access, getAccess, can };
}
