import { useState } from 'react';
import { Briefcase, Home, Lock, Unlock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function DashboardModeSwitcher() {
  const { 
    mode, 
    setMode, 
    isPersonalUnlocked, 
    unlockPersonal, 
    lockPersonal,
    permissions,
    permissionsLoading,
  } = useDashboardMode();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleModeSwitch = (targetMode: 'office' | 'personal') => {
    if (targetMode === 'personal' && !isPersonalUnlocked) {
      setShowPasswordDialog(true);
      return;
    }
    setMode(targetMode);
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsVerifying(true);
    try {
      const success = await unlockPersonal(password);
      if (success) {
        setShowPasswordDialog(false);
        setPassword('');
        toast.success('Personal mode unlocked');
      } else {
        toast.error('Incorrect password');
      }
    } catch {
      toast.error('Failed to verify password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    lockPersonal();
    toast.info('Personal mode locked');
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 h-10 w-32 justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If only one mode is enabled, show a simplified view
  const onlyOffice = permissions.office_enabled && !permissions.personal_enabled;
  const onlyPersonal = !permissions.office_enabled && permissions.personal_enabled;

  if (onlyOffice) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 px-3 h-10">
        <Briefcase className="h-4 w-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">Office</span>
      </div>
    );
  }

  if (onlyPersonal) {
    return (
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 px-3 h-10">
        <Home className="h-4 w-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">Personal</span>
        {!isPersonalUnlocked && <Lock className="h-3 w-3" />}
        {isPersonalUnlocked && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLock}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Lock personal mode"
          >
            <Unlock className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Both modes disabled - shouldn't happen but handle gracefully
  if (!permissions.office_enabled && !permissions.personal_enabled) {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-lg p-1 px-3 h-10">
        <Lock className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">No Access</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {permissions.office_enabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleModeSwitch('office')}
            className={cn(
              'flex items-center gap-1 md:gap-2 h-8 px-2 md:px-3 rounded-md transition-all',
              mode === 'office' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Briefcase className="h-4 w-4" />
            <span className="text-xs md:text-sm font-medium hidden sm:inline">Office</span>
          </Button>
        )}
        {permissions.personal_enabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleModeSwitch('personal')}
            className={cn(
              'flex items-center gap-1 md:gap-2 h-8 px-2 md:px-3 rounded-md transition-all',
              mode === 'personal' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Home className="h-4 w-4" />
            <span className="text-xs md:text-sm font-medium hidden sm:inline">Personal</span>
            {!isPersonalUnlocked && <Lock className="h-3 w-3 ml-1" />}
          </Button>
        )}
        {isPersonalUnlocked && mode === 'personal' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLock}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Lock personal mode"
          >
            <Unlock className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Unlock Personal Mode
            </DialogTitle>
            <DialogDescription>
              Enter your password to access personal dashboard with sensitive information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                autoFocus
              />
            </div>
            <Button 
              onClick={handleUnlock} 
              className="w-full"
              disabled={isVerifying}
            >
              {isVerifying ? 'Verifying...' : 'Unlock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
