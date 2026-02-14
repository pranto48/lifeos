import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRUST_EXPIRY_DAYS = 90; // 3 months

interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  ip_address: string | null;
  device_info: string | null;
  trusted_at: string;
  expires_at: string;
}

// Generate a device fingerprint.
// Prefer a stable per-browser random id to avoid collisions between different devices
// that happen to share the same browser/OS/screen characteristics.
const DEVICE_ID_STORAGE_KEY = 'lifeos_device_fingerprint_v1';

function generateDeviceFingerprint(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;

    const newId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(DEVICE_ID_STORAGE_KEY, newId);
    return newId;
  } catch {
    // Fall back to a deterministic fingerprint when storage is unavailable.
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    const cores = navigator.hardwareConcurrency || 'unknown';

    const raw = `${ua}-${screen}-${timezone}-${language}-${platform}-${cores}`;

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Get device info string
function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

export function useTrustedDevice() {
  const [isTrusted, setIsTrusted] = useState(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);

  // Fetch current IP address
  const fetchCurrentIp = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setCurrentIp(data.ip);
      return data.ip;
    } catch {
      return null;
    }
  }, []);

  // Check if current device is trusted for a specific user
  const checkTrustedDevice = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Check local cache first to avoid unnecessary DB/network calls
      try {
        const cached = localStorage.getItem(`trusted_device_${userId}`);
        if (cached) {
          const { expires_at, cached_at } = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(cached_at).getTime();
          const CACHE_TTL = 24 * 60 * 60 * 1000; // Re-validate once per day
          if (new Date(expires_at) > new Date() && cacheAge < CACHE_TTL) {
            setIsTrusted(true);
            return true;
          }
        }
      } catch {}

      const deviceFingerprint = generateDeviceFingerprint();
      const ip = await fetchCurrentIp();
      
      // Query the database for a matching trusted device
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (error || !data || data.length === 0) {
        setIsTrusted(false);
        return false;
      }

      const device = data[0] as TrustedDevice;
      
      // Update stored IP if it changed (dynamic IPs are common)
      // We no longer block trust due to IP changes — the device fingerprint is the primary identifier
      if (device.ip_address && ip && device.ip_address !== ip) {
        await supabase
          .from('trusted_devices')
          .update({ ip_address: ip })
          .eq('id', device.id);
      }

      // Cache trust locally to avoid repeated DB lookups
      try {
        localStorage.setItem(`trusted_device_${userId}`, JSON.stringify({
          expires_at: device.expires_at,
          cached_at: new Date().toISOString(),
        }));
      } catch {}

      setIsTrusted(true);
      return true;
    } catch {
      setIsTrusted(false);
      return false;
    }
  }, [fetchCurrentIp]);

  // Trust the current device for the user (90 days / 3 months)
  const trustDevice = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      const ip = await fetchCurrentIp();
      const deviceInfo = getDeviceInfo();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + TRUST_EXPIRY_DAYS);

      const { error } = await supabase
        .from('trusted_devices')
        .upsert({
          user_id: userId,
          device_fingerprint: deviceFingerprint,
          ip_address: ip,
          device_info: deviceInfo,
          trusted_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'user_id,device_fingerprint'
        });

      if (error) {
        console.error('Error trusting device:', error);
        return false;
      }

      // Also update the user_sessions table with MFA verification time
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const mfaExpiresAt = new Date();
        mfaExpiresAt.setDate(mfaExpiresAt.getDate() + TRUST_EXPIRY_DAYS);
        
        await supabase
          .from('user_sessions')
          .update({
            mfa_verified_at: new Date().toISOString(),
            mfa_expires_at: mfaExpiresAt.toISOString(),
          })
          .eq('user_id', userId)
          .eq('device_info', deviceInfo);
      }

      setIsTrusted(true);
      return true;
    } catch (error) {
      console.error('Error trusting device:', error);
      return false;
    }
  }, [fetchCurrentIp]);

  // Remove trust from current device
  const removeTrust = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint);

      if (error) {
        console.error('Error removing trust:', error);
        return false;
      }

      try { localStorage.removeItem(`trusted_device_${userId}`); } catch {}
      setIsTrusted(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Remove all trusted devices for user
  const removeAllTrust = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing all trust:', error);
        return false;
      }

      try { localStorage.removeItem(`trusted_device_${userId}`); } catch {}
      setIsTrusted(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Get remaining days of trust for current device
  const getRemainingDays = useCallback(async (userId: string): Promise<number | null> => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      
      const { data } = await supabase
        .from('trusted_devices')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .limit(1);

      if (!data || data.length === 0) return null;

      const expiresAt = new Date(data[0].expires_at);
      if (expiresAt <= new Date()) return null;

      const remainingMs = expiresAt.getTime() - Date.now();
      return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    } catch {
      return null;
    }
  }, []);

  // Get all trusted devices for user
  const getTrustedDevices = useCallback(async (userId: string): Promise<TrustedDevice[]> => {
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('trusted_at', { ascending: false });

      if (error) {
        console.error('Error fetching trusted devices:', error);
        return [];
      }

      return data as TrustedDevice[];
    } catch {
      return [];
    }
  }, []);

  return {
    isTrusted,
    currentIp,
    checkTrustedDevice,
    trustDevice,
    removeTrust,
    removeAllTrust,
    getRemainingDays,
    getTrustedDevices,
  };
}
