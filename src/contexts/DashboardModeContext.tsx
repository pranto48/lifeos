import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type DashboardMode = 'office' | 'personal';

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

interface DashboardModeContextType {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  isPersonalUnlocked: boolean;
  unlockPersonal: (password: string) => Promise<boolean>;
  lockPersonal: () => void;
  resetAutoLockTimer: () => void;
}

const DashboardModeContext = createContext<DashboardModeContextType | undefined>(undefined);

export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<DashboardMode>('office');
  const [isPersonalUnlocked, setIsPersonalUnlocked] = useState(false);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lockPersonal = useCallback(() => {
    setIsPersonalUnlocked(false);
    setModeState('office');
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
  }, []);

  const resetAutoLockTimer = useCallback(() => {
    if (!isPersonalUnlocked || mode !== 'personal') return;
    
    // Clear existing timer
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
    
    // Set new timer
    autoLockTimerRef.current = setTimeout(() => {
      lockPersonal();
    }, AUTO_LOCK_TIMEOUT);
  }, [isPersonalUnlocked, mode, lockPersonal]);

  // Start auto-lock timer when entering personal mode
  useEffect(() => {
    if (isPersonalUnlocked && mode === 'personal') {
      resetAutoLockTimer();
      
      // Listen for user activity to reset timer
      const handleActivity = () => resetAutoLockTimer();
      
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);
      
      return () => {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('touchstart', handleActivity);
        
        if (autoLockTimerRef.current) {
          clearTimeout(autoLockTimerRef.current);
        }
      };
    }
  }, [isPersonalUnlocked, mode, resetAutoLockTimer]);

  const setMode = (newMode: DashboardMode) => {
    if (newMode === 'personal' && !isPersonalUnlocked) {
      // Don't allow switching to personal mode if not unlocked
      return;
    }
    setModeState(newMode);
  };

  const unlockPersonal = async (password: string): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      // Use reauthenticate to verify password without creating a new session
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.reauthenticate();
      
      // Reauthenticate sends a nonce, so we verify with signInWithPassword
      // but the session should already exist
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });
      
      if (!signInError) {
        // Immediately set state after successful verification
        setIsPersonalUnlocked(true);
        setModeState('personal');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <DashboardModeContext.Provider value={{ 
      mode, 
      setMode, 
      isPersonalUnlocked, 
      unlockPersonal, 
      lockPersonal,
      resetAutoLockTimer,
    }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (context === undefined) {
    throw new Error('useDashboardMode must be used within a DashboardModeProvider');
  }
  return context;
}
