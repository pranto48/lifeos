import { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export function PasswordChange() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({ 
        title: 'Invalid Password', 
        description: 'Password must be at least 8 characters long.', 
        variant: 'destructive' 
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ 
        title: 'Passwords do not match', 
        description: 'Please make sure both passwords are the same.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: 'Password Updated', 
        description: 'Your password has been changed successfully.' 
      });
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Key className="h-5 w-5" /> Change Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>New Password</Label>
          <div className="relative">
            <Input 
              type={showPassword ? 'text' : 'password'} 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
              className="bg-muted/50 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Confirm New Password</Label>
          <Input 
            type={showPassword ? 'text' : 'password'} 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="bg-muted/50"
          />
        </div>
        <Button 
          onClick={handlePasswordChange} 
          disabled={loading || !newPassword || !confirmPassword}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}
