import { useState, useEffect, useCallback } from 'react';

const TRUSTED_DEVICE_KEY = 'mfa_trusted_device';
const TRUSTED_DEVICE_EXPIRY_DAYS = 30;

interface TrustedDeviceData {
  userId: string;
  expiresAt: number;
  deviceFingerprint: string;
}

// Generate a simple device fingerprint
function generateDeviceFingerprint(): string {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  const raw = `${ua}-${screen}-${timezone}-${language}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function useTrustedDevice() {
  const [isTrusted, setIsTrusted] = useState(false);

  // Check if current device is trusted for a specific user
  const checkTrustedDevice = useCallback((userId: string): boolean => {
    try {
      const stored = localStorage.getItem(TRUSTED_DEVICE_KEY);
      if (!stored) return false;

      const data: TrustedDeviceData = JSON.parse(stored);
      const currentFingerprint = generateDeviceFingerprint();
      
      // Verify user ID, fingerprint, and expiry
      if (
        data.userId === userId &&
        data.deviceFingerprint === currentFingerprint &&
        data.expiresAt > Date.now()
      ) {
        return true;
      }

      // Clean up expired/invalid trust
      localStorage.removeItem(TRUSTED_DEVICE_KEY);
      return false;
    } catch {
      return false;
    }
  }, []);

  // Trust the current device for the user
  const trustDevice = useCallback((userId: string): void => {
    const expiresAt = Date.now() + (TRUSTED_DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const deviceFingerprint = generateDeviceFingerprint();
    
    const data: TrustedDeviceData = {
      userId,
      expiresAt,
      deviceFingerprint,
    };

    localStorage.setItem(TRUSTED_DEVICE_KEY, JSON.stringify(data));
    setIsTrusted(true);
  }, []);

  // Remove trust from current device
  const removeTrust = useCallback((): void => {
    localStorage.removeItem(TRUSTED_DEVICE_KEY);
    setIsTrusted(false);
  }, []);

  // Get remaining days of trust
  const getRemainingDays = useCallback((): number | null => {
    try {
      const stored = localStorage.getItem(TRUSTED_DEVICE_KEY);
      if (!stored) return null;

      const data: TrustedDeviceData = JSON.parse(stored);
      if (data.expiresAt <= Date.now()) return null;

      const remainingMs = data.expiresAt - Date.now();
      return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    } catch {
      return null;
    }
  }, []);

  return {
    isTrusted,
    checkTrustedDevice,
    trustDevice,
    removeTrust,
    getRemainingDays,
  };
}
