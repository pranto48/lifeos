import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, LogOut, Mail, Bell, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { SessionManagement } from '@/components/settings/SessionManagement';
import { PasswordChange } from '@/components/settings/PasswordChange';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { BiometricManagement } from '@/components/settings/BiometricManagement';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';
import { TrustedDevicesManagement } from '@/components/settings/TrustedDevicesManagement';
import { DataExport } from '@/components/settings/DataExport';
import { CalendarIntegrationSettings } from '@/components/settings/CalendarIntegrationSettings';
import { AdminSettings } from '@/components/settings/AdminSettings';
export default function Settings() {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

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

  const sendTestReminder = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-task-reminders');
      
      if (error) throw error;
      
      toast({ 
        title: language === 'bn' ? 'রিমাইন্ডার পাঠানো হয়েছে' : 'Reminders Sent', 
        description: data.message || (language === 'bn' ? 'কাজের রিমাইন্ডার প্রসেস করা হয়েছে।' : 'Task reminders have been processed.')
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send reminders', 
        variant: 'destructive' 
      });
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">{t('settings.title')}</h1>

      {/* Language Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Languages className="h-5 w-5" /> {t('settings.language')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.language')}</Label>
            <Select value={language} onValueChange={(v: 'bn' | 'en') => setLanguage(v)}>
              <SelectTrigger className="w-full bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bn">
                  <span className="flex items-center gap-2">
                    🇧🇩 {t('settings.bangla')}
                  </span>
                </SelectItem>
                <SelectItem value="en">
                  <span className="flex items-center gap-2">
                    🇬🇧 {t('settings.english')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'এই সেটিং পুরো অ্যাপে প্রযোজ্য হবে।' : 'This setting will be applied across the entire app.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" /> {t('settings.profile')}
          </CardTitle>
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
          <Button onClick={saveProfile} disabled={loading}>
            {loading ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : t('common.save')}
          </Button>
        </CardContent>
      </Card>

      <SessionManagement />
      
      <PasswordChange />
      
      <TwoFactorAuth />
      
      <TrustedDevicesManagement />

      <BiometricManagement />

      <PushNotificationSettings />

      <CalendarIntegrationSettings />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5" /> {language === 'bn' ? 'ইমেইল রিমাইন্ডার' : 'Email Reminders'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === 'bn' 
              ? 'আজ বা অতিরিক্ত বকেয়া কাজের জন্য ইমেইল রিমাইন্ডার পান। রিমাইন্ডার আপনার নিবন্ধিত ইমেইল ঠিকানায় পাঠানো হবে।'
              : 'Get email reminders for tasks that are due today or overdue. Reminders are sent to your registered email address.'
            }
          </p>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={sendTestReminder} 
              disabled={sendingReminders}
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingReminders 
                ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') 
                : (language === 'bn' ? 'এখনই রিমাইন্ডার পাঠান' : 'Send Reminder Now')
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' 
              ? '💡 কাজ (সকাল ৮টা), অভ্যাস (প্রতি ঘণ্টা), এবং পারিবারিক ইভেন্টের (সকাল ৭টা) জন্য স্বয়ংক্রিয় দৈনিক রিমাইন্ডার সক্রিয় আছে।'
              : '💡 Automated daily reminders are enabled for tasks (8 AM), habits (hourly), and family events (7 AM).'
            }
          </p>
        </CardContent>
      </Card>

      <DataExport />

      <AdminSettings />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" /> {t('settings.security')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {language === 'bn' ? 'রো লেভেল সিকিউরিটি' : 'Row Level Security'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'আপনার সব ডেটা ডেটাবেস-লেভেল সিকিউরিটি পলিসি দ্বারা সুরক্ষিত। শুধুমাত্র আপনি আপনার ডেটা অ্যাক্সেস করতে পারবেন।'
                    : 'All your data is protected with database-level security policies. Only you can access your data.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {language === 'bn' ? 'ভল্ট নোট এনক্রিপশন' : 'Vault Notes Encryption'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'ভল্ট নোট AES-256-GCM এনক্রিপশন এবং PBKDF2 কী ডেরিভেশন ব্যবহার করে। আপনার পাসফ্রেজ কখনই আপনার ব্রাউজার ছেড়ে যায় না।'
                    : 'Vault notes use AES-256-GCM encryption with PBKDF2 key derivation. Your passphrase never leaves your browser.'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> {t('settings.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <SettingsIcon className="h-5 w-5" /> {t('settings.preferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-foreground">{t('settings.timezone')}</span>
            <span className="text-sm text-muted-foreground">{profile?.timezone || 'Asia/Dhaka'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-foreground">{t('settings.currency')}</span>
            <span className="text-sm text-muted-foreground">{profile?.currency || 'BDT'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-foreground">{t('settings.dateFormat')}</span>
            <span className="text-sm text-muted-foreground">{profile?.date_format || 'DD/MM/YYYY'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
