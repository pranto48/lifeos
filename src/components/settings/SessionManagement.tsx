import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Globe, Trash2, AlertCircle, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface UserSession {
  id: string;
  session_token: string;
  device_info: string | null;
  ip_address: string | null;
  last_active: string;
  created_at: string;
  is_revoked: boolean;
}

export function SessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSessions();
      getCurrentSession();
    }
  }, [user]);

  const getCurrentSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setCurrentSessionToken(data.session.access_token.slice(-20));
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_revoked', false)
      .order('last_active', { ascending: false })
      .limit(5); // Show only last 5 sessions

    if (error) {
      console.error('Error loading sessions:', error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const registerCurrentSession = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || !user) return;

    const sessionToken = sessionData.session.access_token.slice(-20);
    
    // Check if session already exists
    const { data: existing } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .maybeSingle();

    if (existing) {
      // Update last active
      await supabase
        .from('user_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Create new session
      const deviceInfo = getDeviceInfo();
      await supabase.from('user_sessions').insert({
        user_id: user.id,
        session_token: sessionToken,
        device_info: deviceInfo,
        ip_address: null, // Can't get client IP from browser
        last_active: new Date().toISOString(),
      });
    }
    
    loadSessions();
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let device = 'Unknown Device';
    let browser = 'Unknown Browser';
    
    // Detect device
    if (/Android/i.test(ua)) device = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) device = 'iOS';
    else if (/Windows/i.test(ua)) device = 'Windows';
    else if (/Mac/i.test(ua)) device = 'macOS';
    else if (/Linux/i.test(ua)) device = 'Linux';
    
    // Detect browser
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    
    return `${browser} on ${device}`;
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The device will be signed out.')) return;

    const { error } = await supabase
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('id', sessionId);

    if (error) {
      toast.error('Failed to revoke session');
    } else {
      toast.success('Session revoked successfully');
      loadSessions();
    }
  };

  const revokeAllOtherSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? All other devices will be signed out.')) return;

    const { error } = await supabase
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('user_id', user?.id)
      .neq('session_token', currentSessionToken || '');

    if (error) {
      toast.error('Failed to revoke sessions');
    } else {
      toast.success('All other sessions revoked');
      loadSessions();
    }
  };

  const getDeviceIcon = (deviceInfo: string | null) => {
    if (!deviceInfo) return <Globe className="h-5 w-5" />;
    if (/Android|iOS|iPhone|iPad/i.test(deviceInfo)) return <Smartphone className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  const isCurrentSession = (session: UserSession) => {
    return session.session_token === currentSessionToken;
  };

  useEffect(() => {
    if (user) {
      registerCurrentSession();
    }
  }, [user]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Monitor className="h-5 w-5" /> Active Sessions (Last 5)
            </CardTitle>
            <CardDescription className="mt-1">
              Manage your active sessions across devices. Showing last 5 sessions.
            </CardDescription>
          </div>
          {sessions.length > 1 && (
            <Button variant="outline" size="sm" onClick={revokeAllOtherSessions}>
              Sign Out Other Devices
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No active sessions found</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={registerCurrentSession}>
              Register Current Session
            </Button>
          </div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id} 
              className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                isCurrentSession(session) ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCurrentSession(session) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {getDeviceIcon(session.device_info)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {session.device_info || 'Unknown Device'}
                    </span>
                    {isCurrentSession(session) && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                    </span>
                    {session.ip_address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.ip_address}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!isCurrentSession(session) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => revokeSession(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
