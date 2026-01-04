import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardMode } from '@/contexts/DashboardModeContext';

interface PersonalPageGuardProps {
  children: ReactNode;
}

export function PersonalPageGuard({ children }: PersonalPageGuardProps) {
  const { mode, isPersonalUnlocked } = useDashboardMode();
  const navigate = useNavigate();

  useEffect(() => {
    // If in office mode or personal is not unlocked, redirect to dashboard
    if (mode === 'office' || !isPersonalUnlocked) {
      navigate('/', { replace: true });
    }
  }, [mode, isPersonalUnlocked, navigate]);

  // Don't render children if not in personal mode
  if (mode === 'office' || !isPersonalUnlocked) {
    return null;
  }

  return <>{children}</>;
}
