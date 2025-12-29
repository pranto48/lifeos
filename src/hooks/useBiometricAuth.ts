import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  detectWebAuthnCapabilities,
  registerWebAuthnCredential,
  authenticateWithWebAuthn,
  getStoredCredentialIds,
  storeCredentialId,
  storeBiometricEmail,
  getStoredBiometricEmail,
  hasBiometricCredentials,
  clearBiometricData,
  WebAuthnCapabilities,
} from '@/lib/webauthn';
import { toast } from '@/hooks/use-toast';

interface UseBiometricAuthReturn {
  capabilities: WebAuthnCapabilities | null;
  isLoading: boolean;
  hasBiometricSetup: boolean;
  biometricEmail: string | null;
  registerBiometric: (userId: string, email: string, fullName: string) => Promise<boolean>;
  authenticateWithBiometric: () => Promise<{ email: string } | null>;
  removeBiometric: () => Promise<void>;
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [capabilities, setCapabilities] = useState<WebAuthnCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);
  const [biometricEmail, setBiometricEmail] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const caps = await detectWebAuthnCapabilities();
        setCapabilities(caps);
        setHasBiometricSetup(hasBiometricCredentials());
        setBiometricEmail(getStoredBiometricEmail());
      } catch (error) {
        console.error('Failed to detect WebAuthn capabilities:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const registerBiometric = useCallback(async (
    userId: string,
    email: string,
    fullName: string
  ): Promise<boolean> => {
    if (!capabilities?.canUseBiometrics) {
      toast({
        title: 'Biometrics not available',
        description: 'Your device does not support biometric authentication.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsLoading(true);
      
      // Register the credential with the device
      const result = await registerWebAuthnCredential(userId, email, fullName);
      
      // Store in database
      const { error } = await supabase
        .from('user_webauthn_credentials')
        .insert({
          user_id: userId,
          credential_id: result.credentialId,
          public_key: result.publicKey,
          transports: result.transports,
          device_type: capabilities.isAndroid ? 'android' : 'other',
          friendly_name: `${capabilities.isAndroid ? 'Android' : 'Device'} Biometric`,
        });

      if (error) {
        throw error;
      }

      // Store locally for quick access
      storeCredentialId(result.credentialId);
      storeBiometricEmail(email);
      setHasBiometricSetup(true);
      setBiometricEmail(email);

      toast({
        title: 'Biometric registered',
        description: 'You can now sign in using your fingerprint.',
      });

      return true;
    } catch (error: any) {
      console.error('Biometric registration failed:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Registration cancelled',
          description: 'Biometric registration was cancelled.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Registration failed',
          description: error.message || 'Failed to register biometric.',
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [capabilities]);

  const authenticateWithBiometric = useCallback(async (): Promise<{ email: string } | null> => {
    const storedEmail = getStoredBiometricEmail();
    const credentialIds = getStoredCredentialIds();

    if (!storedEmail || credentialIds.length === 0) {
      toast({
        title: 'No biometric setup',
        description: 'Please sign in with email first and set up biometric.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setIsLoading(true);
      
      // Authenticate with the device
      const result = await authenticateWithWebAuthn(credentialIds);
      
      // Verify the credential exists in database
      const { data, error } = await supabase
        .from('user_webauthn_credentials')
        .select('user_id')
        .eq('credential_id', result.credentialId)
        .single();

      if (error || !data) {
        // Credential not found in DB, clear local storage
        clearBiometricData();
        setHasBiometricSetup(false);
        setBiometricEmail(null);
        throw new Error('Credential not found. Please sign in with email.');
      }

      // Update last used timestamp
      await supabase
        .from('user_webauthn_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('credential_id', result.credentialId);

      return { email: storedEmail };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Authentication cancelled',
          description: 'Biometric authentication was cancelled.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Authentication failed',
          description: error.message || 'Biometric authentication failed.',
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeBiometric = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const credentialIds = getStoredCredentialIds();
      
      if (credentialIds.length > 0) {
        // Remove from database
        await supabase
          .from('user_webauthn_credentials')
          .delete()
          .in('credential_id', credentialIds);
      }

      // Clear local storage
      clearBiometricData();
      setHasBiometricSetup(false);
      setBiometricEmail(null);

      toast({
        title: 'Biometric removed',
        description: 'Biometric login has been disabled for this device.',
      });
    } catch (error: any) {
      console.error('Failed to remove biometric:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove biometric.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    capabilities,
    isLoading,
    hasBiometricSetup,
    biometricEmail,
    registerBiometric,
    authenticateWithBiometric,
    removeBiometric,
  };
}
