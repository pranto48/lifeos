import { useState, useEffect } from 'react';
import { Fingerprint, Trash2, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { format } from 'date-fns';

interface WebAuthnCredential {
  id: string;
  friendly_name: string | null;
  device_type: string | null;
  created_at: string;
  last_used_at: string | null;
}

export function BiometricManagement() {
  const { user } = useAuth();
  const { capabilities, removeBiometric } = useBiometricAuth();
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const isSupported = capabilities?.isSupported ?? false;
  const isAndroidChrome = capabilities?.isAndroid ?? false;

  useEffect(() => {
    if (user) loadCredentials();
  }, [user]);

  const loadCredentials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_webauthn_credentials')
      .select('id, friendly_name, device_type, created_at, last_used_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load credentials', variant: 'destructive' });
    } else {
      setCredentials(data || []);
    }
    setLoading(false);
  };

  const handleRemove = async (credentialId: string) => {
    setRemoving(credentialId);
    
    const { error } = await supabase
      .from('user_webauthn_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', user?.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove credential', variant: 'destructive' });
    } else {
      // Also clear local storage if this was the current device's credential
      removeBiometric();
      setCredentials(prev => prev.filter(c => c.id !== credentialId));
      toast({ title: 'Removed', description: 'Biometric credential has been removed.' });
    }
    setRemoving(null);
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType?.toLowerCase().includes('mobile') || deviceType?.toLowerCase().includes('android')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Fingerprint className="h-5 w-5" /> Biometric Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported && (
          <p className="text-sm text-muted-foreground">
            Biometric authentication is not supported on this device/browser.
          </p>
        )}

        {isSupported && isAndroidChrome && (
          <p className="text-sm text-muted-foreground">
            Use fingerprint or face recognition for quick login on supported Android devices.
          </p>
        )}

        {isSupported && !isAndroidChrome && (
          <p className="text-sm text-muted-foreground">
            For iPhone users, save your password in Safari to use Face ID/Touch ID for autofill.
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No biometric credentials registered.
            {isAndroidChrome && (
              <p className="mt-1">Log in with your password to set up fingerprint login.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    {getDeviceIcon(credential.device_type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {credential.friendly_name || credential.device_type || 'Biometric Credential'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {format(new Date(credential.created_at), 'MMM d, yyyy')}
                      {credential.last_used_at && (
                        <> · Last used {format(new Date(credential.last_used_at), 'MMM d, yyyy')}</>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(credential.id)}
                  disabled={removing === credential.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {removing === credential.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
