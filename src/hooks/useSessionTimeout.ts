import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function useSessionTimeout(enabled: boolean = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled) {
      timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    }
  }, [enabled, handleLogout]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    const handler = () => resetTimer();
    EVENTS.forEach(e => document.addEventListener(e, handler, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach(e => document.removeEventListener(e, handler));
    };
  }, [enabled, resetTimer]);
}
