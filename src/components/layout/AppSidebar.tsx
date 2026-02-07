import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Lightbulb,
  Repeat,
  Users,
  HeadsetIcon,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  HardDrive,
  Landmark,
  Ticket
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TranslationKey } from '@/translations';

interface NavItem {
  titleKey: TranslationKey;
  url: string;
  icon: any;
  personalOnly?: boolean;
  officeOnly?: boolean;
}

const navItems: NavItem[] = [
  { titleKey: 'nav.dashboard', url: '/', icon: LayoutDashboard },
  { titleKey: 'nav.calendar', url: '/calendar', icon: Calendar },
  { titleKey: 'nav.tasks', url: '/tasks', icon: CheckSquare },
  { titleKey: 'nav.notes', url: '/notes', icon: FileText },
  { titleKey: 'nav.supportUsers', url: '/support-users', icon: HeadsetIcon, officeOnly: true },
  { titleKey: 'nav.deviceInventory', url: '/device-inventory', icon: HardDrive, officeOnly: true },
  { titleKey: 'nav.supportTickets', url: '/support-tickets', icon: Ticket, officeOnly: true },
  { titleKey: 'nav.habits', url: '/habits', icon: Repeat, personalOnly: true },
  { titleKey: 'nav.family', url: '/family', icon: Users, personalOnly: true },
  { titleKey: 'nav.budget', url: '/budget', icon: Wallet, personalOnly: true },
  { titleKey: 'nav.salary', url: '/salary', icon: DollarSign, personalOnly: true },
  { titleKey: 'nav.investments', url: '/investments', icon: TrendingUp, personalOnly: true },
  { titleKey: 'nav.loans', url: '/loans', icon: Landmark, personalOnly: true },
  { titleKey: 'nav.goals', url: '/goals', icon: Target },
  { titleKey: 'nav.projects', url: '/projects', icon: Lightbulb },
];

const bottomNavItems: { titleKey: TranslationKey; url: string; icon: any }[] = [
  { titleKey: 'nav.settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const { mode } = useDashboardMode();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on dashboard mode
  const filteredNavItems = navItems.filter(item => {
    if (mode === 'office' && item.personalOnly) {
      return false;
    }
    if (mode === 'personal' && item.officeOnly) {
      return false;
    }
    return true;
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex-col z-40"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-sidebar-foreground">LifeOS</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredNavItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive(item.url)
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <item.icon className={cn(
              'h-5 w-5 flex-shrink-0',
              isActive(item.url) && 'text-sidebar-primary'
            )} />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {t(item.titleKey)}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive(item.url) && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
              />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-3 space-y-1 border-t border-sidebar-border">
        {bottomNavItems.map(item => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive(item.url)
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {t(item.titleKey)}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
        
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                {t('settings.logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* User Info */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          'flex items-center gap-3 px-2 py-2',
          collapsed && 'justify-center'
        )}>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
