import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type DashboardMode = 'office' | 'personal';

interface DashboardModeContextType {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  isPersonalUnlocked: boolean;
  unlockPersonal: (password: string) => Promise<boolean>;
  lockPersonal: () => void;
}

const DashboardModeContext = createContext<DashboardModeContextType | undefined>(undefined);

export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [mode, setModeState] = useState<DashboardMode>('office');
  const [isPersonalUnlocked, setIsPersonalUnlocked] = useState(false);

  // Reset to office mode and lock personal on session change
  useEffect(() => {
    setModeState('office');
    setIsPersonalUnlocked(false);
  }, [session?.access_token]);

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
      // Verify password by attempting to sign in
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });
      
      if (!error) {
        setIsPersonalUnlocked(true);
        setModeState('personal');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const lockPersonal = () => {
    setIsPersonalUnlocked(false);
    setModeState('office');
  };

  return (
    <DashboardModeContext.Provider value={{ 
      mode, 
      setMode, 
      isPersonalUnlocked, 
      unlockPersonal, 
      lockPersonal 
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
