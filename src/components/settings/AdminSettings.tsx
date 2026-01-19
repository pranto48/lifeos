import { useState, useEffect } from 'react';
import { Shield, Users, Key, Calendar, Settings, Loader2, Crown, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface OAuthCredential {
  provider: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  lastUpdated?: string;
}

export function AdminSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [oauthCredentials, setOAuthCredentials] = useState<OAuthCredential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!data);
      
      if (data) {
        await loadUserRoles();
        await loadOAuthCredentials();
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setUserRoles(data);
      }
    } catch (error) {
      console.error('Failed to load user roles:', error);
    }
  };

  const loadOAuthCredentials = async () => {
    setLoadingCredentials(true);
    try {
      const response = await supabase.functions.invoke('save-calendar-credentials', {
        body: { action: 'get' }
      });

      if (response.data) {
        const creds: OAuthCredential[] = [];
        
        if (response.data.google) {
          creds.push({
            provider: 'Google',
            hasClientId: !!response.data.google.clientId,
            hasClientSecret: !!response.data.google.clientSecret,
          });
        }
        
        if (response.data.microsoft) {
          creds.push({
            provider: 'Microsoft',
            hasClientId: !!response.data.microsoft.clientId,
            hasClientSecret: !!response.data.microsoft.clientSecret,
          });
        }
        
        setOAuthCredentials(creds);
      }
    } catch (error) {
      console.error('Failed to load OAuth credentials:', error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return null; // Don't show admin settings to non-admins
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Crown className="h-5 w-5 text-yellow-500" />
          {language === 'bn' ? 'এডমিন সেটিংস' : 'Admin Settings'}
        </CardTitle>
        <CardDescription>
          {language === 'bn' 
            ? 'অ্যাডমিনিস্ট্রেটর-শুধুমাত্র কনফিগারেশন এবং সেটিংস পরিচালনা করুন।'
            : 'Manage administrator-only configurations and settings.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="security" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'bn' ? 'সিকিউরিটি' : 'Security'}</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'bn' ? 'ইন্টিগ্রেশন' : 'Integrations'}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'bn' ? 'ইউজার' : 'Users'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">
                    {language === 'bn' ? 'রো লেভেল সিকিউরিটি (RLS)' : 'Row Level Security (RLS)'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'bn' 
                      ? 'সমস্ত টেবিলে RLS সক্রিয় আছে। ব্যবহারকারীরা শুধুমাত্র তাদের নিজস্ব ডেটা অ্যাক্সেস করতে পারেন।'
                      : 'RLS is enabled on all tables. Users can only access their own data.'
                    }
                  </p>
                  <Badge variant="outline" className="mt-2 text-green-500 border-green-500/30">
                    {language === 'bn' ? 'সুরক্ষিত' : 'Secured'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">
                    {language === 'bn' ? 'এনক্রিপশন' : 'Encryption'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'bn' 
                      ? 'ভল্ট নোটে AES-256-GCM এনক্রিপশন ব্যবহার করা হয়। পাসফ্রেজ ব্রাউজারে থাকে।'
                      : 'Vault notes use AES-256-GCM encryption. Passphrase stays in browser.'
                    }
                  </p>
                  <Badge variant="outline" className="mt-2 text-primary border-primary/30">
                    {language === 'bn' ? 'সক্রিয়' : 'Active'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Settings className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">
                    {language === 'bn' ? 'অডিট লগিং' : 'Audit Logging'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'bn' 
                      ? 'সমস্ত সংবেদনশীল ক্রিয়াকলাপ অডিট লগে রেকর্ড করা হয়।'
                      : 'All sensitive operations are recorded in audit logs.'
                    }
                  </p>
                  <Badge variant="outline" className="mt-2 text-blue-500 border-blue-500/30">
                    {language === 'bn' ? 'সক্রিয়' : 'Enabled'}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations" className="space-y-4 mt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {language === 'bn' 
                  ? 'OAuth ক্রেডেনশিয়াল শুধুমাত্র অ্যাডমিন দ্বারা পরিবর্তন করা যাবে।'
                  : 'OAuth credentials can only be modified by administrators.'
                }
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {language === 'bn' ? 'ক্যালেন্ডার ইন্টিগ্রেশন' : 'Calendar Integrations'}
              </h4>

              {loadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : oauthCredentials.length > 0 ? (
                <div className="space-y-2">
                  {oauthCredentials.map((cred) => (
                    <div key={cred.provider} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          cred.provider === 'Google' ? 'bg-red-500/20' : 'bg-blue-500/20'
                        }`}>
                          <span className="text-sm font-bold">
                            {cred.provider === 'Google' ? 'G' : 'M'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cred.provider} Calendar</p>
                          <p className="text-xs text-muted-foreground">
                            OAuth 2.0 {language === 'bn' ? 'ক্রেডেনশিয়াল' : 'Credentials'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cred.hasClientId && cred.hasClientSecret ? (
                          <Badge variant="default" className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                            {language === 'bn' ? 'কনফিগার করা হয়েছে' : 'Configured'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {language === 'bn' ? 'সেটআপ প্রয়োজন' : 'Needs Setup'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {language === 'bn' ? 'কোনো OAuth ক্রেডেনশিয়াল কনফিগার করা হয়নি।' : 'No OAuth credentials configured.'}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {language === 'bn' 
                  ? 'ক্যালেন্ডার সিঙ্ক সেটিংসে OAuth ক্রেডেনশিয়াল কনফিগার করুন।'
                  : 'Configure OAuth credentials in Calendar Sync settings.'
                }
              </p>
            </div>
          </TabsContent>

          {/* Users Settings */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                {language === 'bn' ? 'ইউজার রোল ম্যানেজমেন্ট' : 'User Role Management'}
              </h4>
              <Badge variant="outline">
                {userRoles.length} {language === 'bn' ? 'রোল' : 'roles'}
              </Badge>
            </div>

            <ScrollArea className="h-[200px] rounded-lg border border-border">
              <div className="p-3 space-y-2">
                {userRoles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        role.role === 'admin' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                      }`}>
                        {role.role === 'admin' ? (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Users className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[150px] sm:max-w-none">
                          {role.user_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(role.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={role.role === 'admin' ? 'default' : 'secondary'}>
                      {role.role === 'admin' 
                        ? (language === 'bn' ? 'এডমিন' : 'Admin') 
                        : (language === 'bn' ? 'ইউজার' : 'User')
                      }
                    </Badge>
                  </div>
                ))}
                {userRoles.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {language === 'bn' ? 'কোনো রোল পাওয়া যায়নি।' : 'No roles found.'}
                  </div>
                )}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              {language === 'bn' 
                ? 'নতুন এডমিন যোগ করতে ডাটাবেসে সরাসরি user_roles টেবিলে রোল যোগ করুন।'
                : 'To add new admins, directly insert roles into the user_roles table in the database.'
              }
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
