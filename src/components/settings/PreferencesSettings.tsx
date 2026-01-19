import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const timezones = [
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
];

const currencies = ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'JPY', 'SGD'];
const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

export function PreferencesSettings() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [currency, setCurrency] = useState('BDT');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user?.id).maybeSingle();
    if (data) {
      setProfile(data);
      setTimezone(data.timezone || 'Asia/Dhaka');
      setCurrency(data.currency || 'BDT');
      setDateFormat(data.date_format || 'DD/MM/YYYY');
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      timezone,
      currency,
      date_format: dateFormat,
    }).eq('user_id', user?.id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ 
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved', 
        description: language === 'bn' ? 'পছন্দসমূহ আপডেট হয়েছে।' : 'Preferences updated successfully.' 
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5" /> {t('settings.preferences')}
          </CardTitle>
          <CardDescription>
            {language === 'bn' ? 'আপনার অ্যাপ পছন্দসমূহ কাস্টমাইজ করুন।' : 'Customize your app preferences.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.timezone')}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('settings.currency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('settings.dateFormat')}</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFormats.map(df => (
                  <SelectItem key={df} value={df}>{df}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={savePreferences} disabled={loading}>
            {loading ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : t('common.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
