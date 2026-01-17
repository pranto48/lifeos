import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Link, Unlink, Eye, EyeOff, Save, HelpCircle, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  
  // Help dialog state
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);
  const [showMicrosoftHelp, setShowMicrosoftHelp] = useState(false);

  useEffect(() => {
    if (user) {
      loadCalendarSyncStatus();
      loadStoredCredentials();
      
      // Handle OAuth callback - check for code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        // Exchange the code for tokens
        handleOAuthCallback(code, state);
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      toast({
        title: language === 'bn' ? 'সংযোগ করা হচ্ছে...' : 'Connecting...',
        description: language === 'bn' ? 'Google Calendar সংযোগ করা হচ্ছে' : 'Connecting to Google Calendar'
      });

      const redirectUri = window.location.origin + window.location.pathname;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { 
          action: 'exchange_code', 
          code, 
          redirectUri 
        }
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংযুক্ত!' : 'Connected!',
        description: language === 'bn' ? 'Google Calendar সফলভাবে সংযুক্ত হয়েছে' : 'Google Calendar connected successfully'
      });

      loadCalendarSyncStatus();
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to connect Google Calendar',
        variant: 'destructive'
      });
    }
  };

  const loadCalendarSyncStatus = async () => {
    const { data } = await supabase
      .from('google_calendar_sync')
      .select('*')
      .eq('user_id', user?.id);
    
    if (data && data.length > 0) {
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
    try {
      const { data, error } = await supabase.functions.invoke('save-calendar-credentials', {
        body: { action: 'get' }
      });
      
      if (error) throw error;
      
      if (data?.credentials) {
        const creds = data.credentials;
        setGoogleClientId(creds.GOOGLE_CLIENT_ID || '');
        setGoogleClientSecret(creds.GOOGLE_CLIENT_SECRET || '');
        setMicrosoftClientId(creds.MICROSOFT_CLIENT_ID || '');
        setMicrosoftClientSecret(creds.MICROSOFT_CLIENT_SECRET || '');
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
      const { data, error } = await supabase.functions.invoke('save-calendar-credentials', {
        body: { 
          action: 'save',
          provider: 'google',
          clientId: googleClientId.trim(),
          clientSecret: googleClientSecret
        }
      });
      
      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
        description: language === 'bn' ? 'Google credentials সংরক্ষিত হয়েছে' : 'Google credentials saved successfully'
      });
      
      loadStoredCredentials();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to save credentials',
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
      const { data, error } = await supabase.functions.invoke('save-calendar-credentials', {
        body: { 
          action: 'save',
          provider: 'microsoft',
          clientId: microsoftClientId.trim(),
          clientSecret: microsoftClientSecret
        }
      });
      
      if (error) throw error;

      toast({
        title: language === 'bn' ? 'সংরক্ষিত' : 'Saved',
        description: language === 'bn' ? 'Microsoft credentials সংরক্ষিত হয়েছে' : 'Microsoft credentials saved successfully'
      });
      
      loadStoredCredentials();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message || 'Failed to save credentials',
        variant: 'destructive'
      });
    } finally {
      setSavingMicrosoft(false);
    }
  };

  const connectGoogleCalendar = async () => {
    setConnectingGoogle(true);
    try {
      // Use the custom domain that's configured in Google Cloud Console
      const redirectUri = window.location.origin;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'get_auth_url', redirectUri }
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth in same window for proper redirect handling
        window.location.href = data.authUrl;
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

  const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/settings` : '';

  return (
    <>
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
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {language === 'bn' ? 'OAuth Credentials' : 'OAuth Credentials'}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowGoogleHelp(true)}
                    className="gap-1 text-primary"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {language === 'bn' ? 'সেটআপ গাইড' : 'Setup Guide'}
                  </Button>
                </div>
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
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {language === 'bn' ? 'OAuth Credentials' : 'OAuth Credentials'}
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowMicrosoftHelp(true)}
                    className="gap-1 text-primary"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {language === 'bn' ? 'সেটআপ গাইড' : 'Setup Guide'}
                  </Button>
                </div>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Google Setup Guide Dialog */}
      <Dialog open={showGoogleHelp} onOpenChange={setShowGoogleHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Google Calendar OAuth Setup Guide
            </DialogTitle>
            <DialogDescription>
              Follow these steps to create OAuth credentials for Google Calendar integration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Go to Google Cloud Console
                </h3>
                <p className="text-muted-foreground pl-8">
                  Open <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Google Cloud Console <ExternalLink className="h-3 w-3" />
                  </a> and sign in with your Google account.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Create a New Project
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Click on the project dropdown at the top</li>
                  <li>Click "New Project"</li>
                  <li>Enter a project name (e.g., "ArifOS Calendar")</li>
                  <li>Click "Create"</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Enable Google Calendar API
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "APIs & Services" → "Library"</li>
                  <li>Search for "Google Calendar API"</li>
                  <li>Click on it and press "Enable"</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                  Configure OAuth Consent Screen
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "APIs & Services" → "OAuth consent screen"</li>
                  <li>Select "External" user type and click "Create"</li>
                  <li>Fill in App name, User support email, and Developer email</li>
                  <li>Click "Save and Continue" through the remaining steps</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">5</span>
                  Create OAuth Credentials
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "APIs & Services" → "Credentials"</li>
                  <li>Click "Create Credentials" → "OAuth client ID"</li>
                  <li>Select "Web application" as application type</li>
                  <li>Add a name for your OAuth client</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">6</span>
                  Add Authorized Redirect URI
                </h3>
                <div className="pl-8 space-y-2">
                  <p className="text-muted-foreground">Under "Authorized redirect URIs", add:</p>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs break-all">
                    {redirectUri}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(redirectUri);
                      toast({ title: 'Copied!', description: 'Redirect URI copied to clipboard' });
                    }}
                  >
                    Copy URI
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">7</span>
                  Copy Credentials
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Click "Create" to generate your credentials</li>
                  <li>Copy the "Client ID" and "Client Secret"</li>
                  <li>Paste them in the fields above and save</li>
                </ul>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                  <strong>Note:</strong> While your app is in testing mode, you may need to add your email as a test user under "OAuth consent screen" → "Test users".
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Microsoft Setup Guide Dialog */}
      <Dialog open={showMicrosoftHelp} onOpenChange={setShowMicrosoftHelp}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Microsoft Outlook OAuth Setup Guide
            </DialogTitle>
            <DialogDescription>
              Follow these steps to create OAuth credentials for Microsoft Outlook integration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                  Go to Azure Portal
                </h3>
                <p className="text-muted-foreground pl-8">
                  Open <a href="https://portal.azure.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                    Azure Portal <ExternalLink className="h-3 w-3" />
                  </a> and sign in with your Microsoft account.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                  Register a New Application
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "Microsoft Entra ID" (formerly Azure AD)</li>
                  <li>Click "App registrations" → "New registration"</li>
                  <li>Enter a name (e.g., "ArifOS Calendar")</li>
                  <li>Select "Accounts in any organizational directory and personal Microsoft accounts"</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  Add Redirect URI
                </h3>
                <div className="pl-8 space-y-2">
                  <p className="text-muted-foreground">Under "Redirect URI", select "Web" and add:</p>
                  <div className="bg-muted p-3 rounded-md font-mono text-xs break-all">
                    {redirectUri}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(redirectUri);
                      toast({ title: 'Copied!', description: 'Redirect URI copied to clipboard' });
                    }}
                  >
                    Copy URI
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">4</span>
                  Copy Application (Client) ID
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>After registration, go to the app's "Overview"</li>
                  <li>Copy the "Application (client) ID"</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">5</span>
                  Create Client Secret
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "Certificates & secrets"</li>
                  <li>Click "New client secret"</li>
                  <li>Add a description and select expiration</li>
                  <li>Click "Add" and immediately copy the "Value" (you won't see it again!)</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">6</span>
                  Add API Permissions
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Go to "API permissions"</li>
                  <li>Click "Add a permission" → "Microsoft Graph"</li>
                  <li>Select "Delegated permissions"</li>
                  <li>Add: Calendars.ReadWrite, User.Read, offline_access</li>
                  <li>Click "Grant admin consent" if available</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">7</span>
                  Save Credentials
                </h3>
                <ul className="text-muted-foreground pl-8 space-y-1 list-disc list-inside">
                  <li>Paste your Application ID and Client Secret in the fields above</li>
                  <li>Click "Save Credentials"</li>
                  <li>Then click "Connect Outlook Calendar"</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                <p className="text-blue-600 dark:text-blue-400 text-sm">
                  <strong>Tip:</strong> For personal Microsoft accounts, make sure you selected "Personal Microsoft accounts" during app registration.
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
