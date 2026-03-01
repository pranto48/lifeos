import { useState, useEffect } from 'react';
import { User, LogOut, Mail, Key, Eye, EyeOff, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isSelfHosted, selfHostedApi, getApiUrl } from '@/lib/selfHostedConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

export function ProfileSettings() {
  const { user, signOut } = useAuth();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user?.id).maybeSingle();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user?.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: language === 'bn' ? 'সংরক্ষিত' : 'Saved', description: language === 'bn' ? 'প্রোফাইল আপডেট হয়েছে।' : 'Profile updated successfully.' });
    setLoading(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setEmailLoading(true);
    try {
      if (isSelfHosted()) {
        const apiUrl = getApiUrl();
        const token = localStorage.getItem('lifeos_token');
        const res = await fetch(`${apiUrl}/auth/update-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ email: newEmail }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update email');
        // Also update profiles table
        await supabase.from('profiles').update({ email: newEmail }).eq('user_id', user?.id);
        toast({ title: 'Email Updated', description: 'Your email has been changed. Please log in again.' });
        setNewEmail('');
      } else {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        toast({ title: 'Verification Sent', description: 'Check your new email to confirm the change.' });
        setNewEmail('');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Invalid Password', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are the same.', variant: 'destructive' });
      return;
    }
    setPasswordLoading(true);
    try {
      if (isSelfHosted()) {
        const apiUrl = getApiUrl();
        const token = localStorage.getItem('lifeos_token');
        const res = await fetch(`${apiUrl}/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to change password');
        toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      } else {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" /> {t('settings.profile')}
          </CardTitle>
          <CardDescription>
            {language === 'bn' ? 'আপনার প্রোফাইল তথ্য পরিচালনা করুন।' : 'Manage your profile information.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.email')}</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.fullName')}</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-muted/50" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : t('common.save')}
            </Button>
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> {t('settings.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Mail className="h-5 w-5" /> {language === 'bn' ? 'ইমেইল পরিবর্তন' : 'Change Email'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' ? 'আপনার ইমেইল ঠিকানা আপডেট করুন।' : 'Update your email address.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'বর্তমান ইমেইল' : 'Current Email'}</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'নতুন ইমেইল' : 'New Email'}</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={language === 'bn' ? 'নতুন ইমেইল লিখুন' : 'Enter new email address'}
              className="bg-muted/50"
            />
          </div>
          <Button onClick={handleEmailChange} disabled={emailLoading || !newEmail}>
            <Mail className="h-4 w-4 mr-2" />
            {emailLoading ? (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (language === 'bn' ? 'ইমেইল আপডেট করুন' : 'Update Email')}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Key className="h-5 w-5" /> {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' ? 'আপনার পাসওয়ার্ড আপডেট করুন।' : 'Update your account password.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSelfHosted() && (
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder={language === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Enter current password'}
                  className="bg-muted/50 pr-10"
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={language === 'bn' ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)' : 'New password (min 8 characters)'}
                className="bg-muted/50 pr-10"
              />
              <Button
                type="button" variant="ghost" size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</Label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
              className="bg-muted/50"
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={passwordLoading || !newPassword || !confirmPassword}
          >
            <Key className="h-4 w-4 mr-2" />
            {passwordLoading ? (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (language === 'bn' ? 'পাসওয়ার্ড আপডেট করুন' : 'Update Password')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
