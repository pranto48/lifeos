import { useState, useEffect } from 'react';
import { Smartphone, Laptop, Monitor, Trash2, Loader2, ShieldCheck, Globe, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTrustedDevice } from '@/hooks/useTrustedDevice';
import { formatDistanceToNow } from 'date-fns';

interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  ip_address: string | null;
  device_info: string | null;
  trusted_at: string;
  expires_at: string;
}

export function TrustedDevicesManagement() {
  const { user } = useAuth();
  const { getTrustedDevices, removeTrust, removeAllTrust } = useTrustedDevice();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingAll, setRemovingAll] = useState(false);

  useEffect(() => {
    if (user) {
      loadDevices();
    }
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;
    setLoading(true);
    const deviceList = await getTrustedDevices(user.id);
    setDevices(deviceList);
    setLoading(false);
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return;
    setRemovingId(deviceId);

    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (error) throw error;

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast({
        title: 'Device removed',
        description: 'The device will need to verify 2FA on next login.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not remove device.',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveAllDevices = async () => {
    if (!user) return;
    setRemovingAll(true);

    try {
      const success = await removeAllTrust(user.id);
      if (!success) throw new Error('Failed to remove devices');

      setDevices([]);
      toast({
        title: 'All devices removed',
        description: 'All devices will need to verify 2FA on next login.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not remove devices.',
        variant: 'destructive',
      });
    } finally {
      setRemovingAll(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return Monitor;
    const info = deviceInfo.toLowerCase();
    if (info.includes('android') || info.includes('ios') || info.includes('iphone')) {
      return Smartphone;
    }
    if (info.includes('mac') || info.includes('windows') || info.includes('linux')) {
      return Laptop;
    }
    return Monitor;
  };

  const getRemainingDays = (expiresAt: string): number => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-5 w-5" /> Trusted Devices
        </CardTitle>
        <CardDescription>
          Devices that can skip 2FA verification. Trust expires after 90 days or when IP changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No trusted devices</p>
            <p className="text-xs mt-1">Devices become trusted when you check "Trust this device" during 2FA verification.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {devices.slice(0, 5).map(device => {
                const DeviceIcon = getDeviceIcon(device.device_info);
                const remainingDays = getRemainingDays(device.expires_at);
                const isExpiringSoon = remainingDays <= 7;

                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <DeviceIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {device.device_info || 'Unknown Device'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {device.ip_address && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {device.ip_address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Trusted {formatDistanceToNow(new Date(device.trusted_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isExpiringSoon ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {remainingDays} days left
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveDevice(device.id)}
                        disabled={removingId === device.id}
                      >
                        {removingId === device.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleRemoveAllDevices}
                disabled={removingAll}
              >
                {removingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove All Trusted Devices
              </Button>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          💡 When you remove a trusted device, it will need to complete 2FA verification on the next login.
        </p>
      </CardContent>
    </Card>
  );
}
