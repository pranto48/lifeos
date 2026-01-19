import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export function ProfileSettings() {
  const { user, signOut } = useAuth();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
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
              {loading ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : t('common.save')}
            </Button>
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> {t('settings.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
