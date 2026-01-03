import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { QuickAddButton } from '@/components/quick-add/QuickAddButton';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { MfaGuard } from '@/components/auth/MfaGuard';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your Life OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MfaGuard>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        
        {/* Main Content */}
        <main className="ml-[72px] md:ml-[240px] min-h-screen transition-all duration-200">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-6">
            <GlobalSearch />
            <QuickAddButton />
          </header>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </MfaGuard>
  );
}
