import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Link, Unlink, Eye, EyeOff, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CalendarSyncConfig {
  id: string;
  provider: 'google' | 'microsoft';
  sync_enabled: boolean;
  last_sync_at: string | null;
  calendar_id: string | null;
}

export function CalendarIntegrationSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  // OAuth credentials state
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [microsoftClientId, setMicrosoftClientId] = useState('');
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState('');
  
  // Show/hide password state
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [showMicrosoftSecret, setShowMicrosoftSecret] = useState(false);
  
  // Sync status state
  const [googleSync, setGoogleSync] = useState<CalendarSyncConfig | null>(null);
  const [microsoftSync, setMicrosoftSync] = useState<CalendarSyncConfig | null>(null);
  
  // Loading states
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [savingMicrosoft, setSavingMicrosoft] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncingMicrosoft, setSyncingMicrosoft] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingMicrosoft, setConnectingMicrosoft] = useState(false);

  useEffect(() => {
    if (user) {
      loadCalendarSyncStatus();
      loadStoredCredentials();
    }
  }, [user]);

  const loadCalendarSyncStatus = async () => {
    const { data } = await supabase
      .from('google_calendar_sync')
      .select('*')
      .eq('user_id', user?.id);
    
    if (data && data.length > 0) {
      // Check if we have Google sync configured
      const googleConfig = data.find(d => !d.calendar_id?.startsWith('outlook_'));
      if (googleConfig) {
        setGoogleSync({
          id: googleConfig.id,
          provider: 'google',
          sync_enabled: googleConfig.sync_enabled,
          last_sync_at: googleConfig.last_sync_at,
          calendar_id: googleConfig.calendar_id
        });
      }
      
      // Check for Microsoft/Outlook sync
      const microsoftConfig = data.find(d => d.calendar_id?.startsWith('outlook_'));
      if (microsoftConfig) {
        setMicrosoftSync({
          id: microsoftConfig.id,
          provider: 'microsoft',
          sync_enabled: microsoftConfig.sync_enabled,
          last_sync_at: microsoftConfig.last_sync_at,
          calendar_id: microsoftConfig.calendar_id
        });
      }
    }
  };

  const loadStoredCredentials = async () => {
    // Load stored OAuth credentials from app_secrets
    try {
      const { data: secrets } = await supabase
        .from('app_secrets')
        .select('id, value')
        .in('id', ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET']);
      
      if (secrets) {
        secrets.forEach(secret => {
          switch (secret.id) {
            case 'GOOGLE_CLIENT_ID':
              setGoogleClientId(secret.value || '');
              break;
            case 'GOOGLE_CLIENT_SECRET':
              setGoogleClientSecret(secret.value ? '••••••••••••' : '');
              break;
            case 'MICROSOFT_CLIENT_ID':
              setMicrosoftClientId(secret.value || '');
              break;
            case 'MICROSOFT_CLIENT_SECRET':
              setMicrosoftClientSecret(secret.value ? '••••••••••••' : '');
              break;
          }
        });
      }
    } catch (error) {
      console.log('Could not load stored credentials');
    }
  };

  const saveGoogleCredentials = async () => {
    if (!googleClientId.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'Google Client ID প্রয়োজন' : 'Google Client ID is required',
        variant: 'destructive'
      });
      return;
    }

    setSavingGoogle(true);
    try {
      // Upsert Google credentials to app_secrets
      const credentials = [
        { id: 'GOOGLE_CLIENT_ID', value: googleClientId }
      ];
      
      // Only include secret if it's not the masked value
      if (googleClientSecret && !googleClientSecret.includes('••••')) {
        credentials.push({ id: 'GOOGLE_CLIENT_SECRET', value: googleClientSecret });
      }

      for (const cred of credentials) {
        await supabase.from('app_secrets').upsert(cred, { onConflict: 'id' });
      }

      toast({
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
        description: language === 'bn' ? 'Google credentials সংরক্ষিত হয়েছে' : 'Google credentials saved successfully'
      });
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingGoogle(false);
    }
  };

  const saveMicrosoftCredentials = async () => {
    if (!microsoftClientId.trim()) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' ? 'Microsoft Client ID প্রয়োজন' : 'Microsoft Client ID is required',
        variant: 'destructive'
      });
      return;
    }

    setSavingMicrosoft(true);
    try {
      const credentials = [
        { id: 'MICROSOFT_CLIENT_ID', value: microsoftClientId }
      ];
      
      if (microsoftClientSecret && !microsoftClientSecret.includes('••••')) {
        credentials.push({ id: 'MICROSOFT_CLIENT_SECRET', value: microsoftClientSecret });
      }

      for (const cred of credentials) {
        await supabase.from('app_secrets').upsert(cred, { onConflict: 'id' });
      }

      toast({
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
        description: language === 'bn' ? 'Microsoft credentials সংরক্ষিত হয়েছে' : 'Microsoft credentials saved successfully'
      });
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSavingMicrosoft(false);
    }
  };

  const connectGoogleCalendar = async () => {
    setConnectingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth flow in new window
        window.open(data.authUrl, '_blank', 'width=500,height=600');
        toast({
          title: language === 'bn' ? 'অনুমোদন প্রয়োজন' : 'Authorization Required',
          description: language === 'bn' ? 'Google সাথে সংযোগ করতে নতুন উইন্ডোতে লগইন করুন' : 'Please log in to Google in the new window to connect'
        });
      }
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setConnectingGoogle(false);
    }
  };

  const connectMicrosoftCalendar = async () => {
    setConnectingMicrosoft(true);
    try {
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-sync', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.open(data.authUrl, '_blank', 'width=500,height=600');
        toast({
          title: language === 'bn' ? 'অনুমোদন প্রয়োজন' : 'Authorization Required',
          description: language === 'bn' ? 'Microsoft সাথে সংযোগ করতে নতুন উইন্ডোতে লগইন করুন' : 'Please log in to Microsoft in the new window to connect'
        });
      }
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setConnectingMicrosoft(false);
    }
  };

  const syncGoogleCalendar = async () => {
    setSyncingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সিঙ্ক সম্পন্ন' : 'Sync Complete',
        description: data?.message || (language === 'bn' ? 'Google Calendar সিঙ্ক হয়েছে' : 'Google Calendar synced successfully')
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingGoogle(false);
    }
  };

  const syncMicrosoftCalendar = async () => {
    setSyncingMicrosoft(true);
    try {
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-sync', {
        body: { action: 'sync' }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সিঙ্ক সম্পন্ন' : 'Sync Complete',
        description: data?.message || (language === 'bn' ? 'Outlook Calendar সিঙ্ক হয়েছে' : 'Outlook Calendar synced successfully')
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSyncingMicrosoft(false);
    }
  };

  const disconnectCalendar = async (provider: 'google' | 'microsoft') => {
    const syncConfig = provider === 'google' ? googleSync : microsoftSync;
    if (!syncConfig) return;

    try {
      await supabase
        .from('google_calendar_sync')
        .delete()
        .eq('id', syncConfig.id);

      if (provider === 'google') {
        setGoogleSync(null);
      } else {
        setMicrosoftSync(null);
      }

      toast({
        title: language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnected',
        description: language === 'bn' 
          ? `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar সংযোগ বিচ্ছিন্ন হয়েছে`
          : `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar disconnected`
      });
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleSync = async (provider: 'google' | 'microsoft', enabled: boolean) => {
    const syncConfig = provider === 'google' ? googleSync : microsoftSync;
    if (!syncConfig) return;

    try {
      await supabase
        .from('google_calendar_sync')
        .update({ sync_enabled: enabled })
        .eq('id', syncConfig.id);

      if (provider === 'google') {
        setGoogleSync({ ...googleSync!, sync_enabled: enabled });
      } else {
        setMicrosoftSync({ ...microsoftSync!, sync_enabled: enabled });
      }

      toast({
        title: enabled 
          ? (language === 'bn' ? 'সিঙ্ক সক্রিয়' : 'Sync Enabled')
          : (language === 'bn' ? 'সিঙ্ক নিষ্ক্রিয়' : 'Sync Disabled'),
        description: language === 'bn'
          ? `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar সিঙ্ক ${enabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'} হয়েছে`
          : `${provider === 'google' ? 'Google' : 'Microsoft'} Calendar sync ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5" />
          {language === 'bn' ? 'ক্যালেন্ডার ইন্টিগ্রেশন' : 'Calendar Integration'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">Google Calendar</TabsTrigger>
            <TabsTrigger value="microsoft">Microsoft Outlook</TabsTrigger>
          </TabsList>
          
          {/* Google Calendar Tab */}
          <TabsContent value="google" className="space-y-4 mt-4">
            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">
                {language === 'bn' ? 'OAuth Credentials' : 'OAuth Credentials'}
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="google-client-id">Client ID</Label>
                  <Input
                    id="google-client-id"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="Enter Google Client ID"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-client-secret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="google-client-secret"
                      type={showGoogleSecret ? 'text' : 'password'}
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      placeholder="Enter Google Client Secret"
                      className="bg-background pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                    >
                      {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={saveGoogleCredentials} disabled={savingGoogle} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {savingGoogle ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Credentials')}
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">
                {language === 'bn' ? 'সংযোগ স্ট্যাটাস' : 'Connection Status'}
              </h4>
              
              {googleSync ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">{language === 'bn' ? 'সংযুক্ত' : 'Connected'}</span>
                    </div>
                    <Switch
                      checked={googleSync.sync_enabled}
                      onCheckedChange={(checked) => toggleSync('google', checked)}
                    />
                  </div>
                  
                  {googleSync.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' ? 'শেষ সিঙ্ক:' : 'Last sync:'} {format(new Date(googleSync.last_sync_at), 'PPp')}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={syncGoogleCalendar}
                      disabled={syncingGoogle || !googleSync.sync_enabled}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncingGoogle ? 'animate-spin' : ''}`} />
                      {syncingGoogle ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (language === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Sync Now')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => disconnectCalendar('google')}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      {language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn' 
                      ? 'Google Calendar এখনো সংযুক্ত নয়। উপরে credentials সংরক্ষণ করে সংযোগ করুন।'
                      : 'Google Calendar is not connected yet. Save your credentials above and connect.'}
                  </p>
                  <Button
                    onClick={connectGoogleCalendar}
                    disabled={connectingGoogle || !googleClientId}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    {connectingGoogle 
                      ? (language === 'bn' ? 'সংযোগ হচ্ছে...' : 'Connecting...')
                      : (language === 'bn' ? 'Google Calendar সংযুক্ত করুন' : 'Connect Google Calendar')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Microsoft Outlook Tab */}
          <TabsContent value="microsoft" className="space-y-4 mt-4">
            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">
                {language === 'bn' ? 'OAuth Credentials' : 'OAuth Credentials'}
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="microsoft-client-id">Application (Client) ID</Label>
                  <Input
                    id="microsoft-client-id"
                    value={microsoftClientId}
                    onChange={(e) => setMicrosoftClientId(e.target.value)}
                    placeholder="Enter Microsoft Client ID"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="microsoft-client-secret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="microsoft-client-secret"
                      type={showMicrosoftSecret ? 'text' : 'password'}
                      value={microsoftClientSecret}
                      onChange={(e) => setMicrosoftClientSecret(e.target.value)}
                      placeholder="Enter Microsoft Client Secret"
                      className="bg-background pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowMicrosoftSecret(!showMicrosoftSecret)}
                    >
                      {showMicrosoftSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={saveMicrosoftCredentials} disabled={savingMicrosoft} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {savingMicrosoft ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Credentials')}
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">
                {language === 'bn' ? 'সংযোগ স্ট্যাটাস' : 'Connection Status'}
              </h4>
              
              {microsoftSync ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">{language === 'bn' ? 'সংযুক্ত' : 'Connected'}</span>
                    </div>
                    <Switch
                      checked={microsoftSync.sync_enabled}
                      onCheckedChange={(checked) => toggleSync('microsoft', checked)}
                    />
                  </div>
                  
                  {microsoftSync.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' ? 'শেষ সিঙ্ক:' : 'Last sync:'} {format(new Date(microsoftSync.last_sync_at), 'PPp')}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={syncMicrosoftCalendar}
                      disabled={syncingMicrosoft || !microsoftSync.sync_enabled}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncingMicrosoft ? 'animate-spin' : ''}`} />
                      {syncingMicrosoft ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (language === 'bn' ? 'এখনই সিঙ্ক করুন' : 'Sync Now')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => disconnectCalendar('microsoft')}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      {language === 'bn' ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {language === 'bn' 
                      ? 'Microsoft Outlook এখনো সংযুক্ত নয়। উপরে credentials সংরক্ষণ করে সংযোগ করুন।'
                      : 'Microsoft Outlook is not connected yet. Save your credentials above and connect.'}
                  </p>
                  <Button
                    onClick={connectMicrosoftCalendar}
                    disabled={connectingMicrosoft || !microsoftClientId}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    {connectingMicrosoft 
                      ? (language === 'bn' ? 'সংযোগ হচ্ছে...' : 'Connecting...')
                      : (language === 'bn' ? 'Outlook Calendar সংযুক্ত করুন' : 'Connect Outlook Calendar')}
                  </Button>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {language === 'bn' 
                ? '💡 Microsoft Azure Portal থেকে App Registration করে Client ID এবং Secret সংগ্রহ করুন। Redirect URI হিসেবে এই অ্যাপের URL ব্যবহার করুন।'
                : '💡 Get your Client ID and Secret from Microsoft Azure Portal App Registration. Use this app\'s URL as the Redirect URI.'}
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
