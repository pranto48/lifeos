import { useState } from 'react';
import { Briefcase, Home, Lock, Unlock } from 'lucide-react';
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
  const { mode, setMode, isPersonalUnlocked, unlockPersonal, lockPersonal } = useDashboardMode();
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

  return (
    <>
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleModeSwitch('office')}
          className={cn(
            'flex items-center gap-2 h-8 px-3 rounded-md transition-all',
            mode === 'office' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Briefcase className="h-4 w-4" />
          <span className="text-sm font-medium">Office</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleModeSwitch('personal')}
          className={cn(
            'flex items-center gap-2 h-8 px-3 rounded-md transition-all',
            mode === 'personal' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-4 w-4" />
          <span className="text-sm font-medium">Personal</span>
          {!isPersonalUnlocked && <Lock className="h-3 w-3 ml-1" />}
        </Button>
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
