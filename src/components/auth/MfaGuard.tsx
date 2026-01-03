import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTrustedDevice } from '@/hooks/useTrustedDevice';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Shield, KeyRound, Monitor, LogOut } from 'lucide-react';

interface MfaGuardProps {
  children: ReactNode;
}

export function MfaGuard({ children }: MfaGuardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkTrustedDevice, trustDevice } = useTrustedDevice();

  const [checking, setChecking] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [trustThisDevice, setTrustThisDevice] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    checkMfaStatus();
  }, [user]);

  const checkMfaStatus = async () => {
    if (!user) return;

    try {
      // Check if user has MFA enrolled
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');

      if (!verifiedFactor) {
        // User doesn't have MFA enabled, allow access
        setRequiresMfa(false);
        setChecking(false);
        return;
      }

      // User has MFA enabled, check if current session is at AAL2
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        console.error('Error checking AAL:', aalError);
        setChecking(false);
        return;
      }

      // If already at AAL2, user has verified MFA in this session
      if (aalData.currentLevel === 'aal2') {
        setRequiresMfa(false);
        setChecking(false);
        return;
      }

      // User needs AAL2 but is at AAL1, check if device is trusted
      const isDeviceTrusted = await checkTrustedDevice(user.id);
      if (isDeviceTrusted) {
        // Device is trusted, allow access without MFA prompt
        // But we should still try to elevate to AAL2 silently if possible
        setRequiresMfa(false);
        setChecking(false);
        return;
      }

      // User needs to complete MFA verification
      setMfaFactorId(verifiedFactor.id);
      setRequiresMfa(true);
      setChecking(false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
      setChecking(false);
    }
  };

  const handleMfaVerification = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid 6-digit code.',
        variant: 'destructive',
      });
      return;
    }

    setMfaLoading(true);
    try {
      // Create a challenge for the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) {
        toast({
          title: 'Verification Failed',
          description: challengeError.message,
          variant: 'destructive',
        });
        return;
      }

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        toast({
          title: 'Invalid Code',
          description: 'The verification code is incorrect. Please try again.',
          variant: 'destructive',
        });
        setMfaCode('');
        return;
      }

      // MFA verification successful - trust device if requested
      if (trustThisDevice && user) {
        await trustDevice(user.id);
      }

      toast({
        title: 'Verified!',
        description: trustThisDevice 
          ? 'This device is now trusted for 90 days.'
          : 'Two-factor authentication verified.',
      });

      setRequiresMfa(false);
      setMfaCode('');
      setTrustThisDevice(false);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Show loading while checking MFA status
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying security...</p>
        </div>
      </div>
    );
  }

  // Show MFA verification modal if required
  if (requiresMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Background glow effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6 max-w-sm w-full relative z-10"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Two-Factor Authentication
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to continue
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                  disabled={mfaLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Trust Device Option */}
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Checkbox
                  id="trustDeviceGuard"
                  checked={trustThisDevice}
                  onCheckedChange={(checked) => setTrustThisDevice(checked === true)}
                  disabled={mfaLoading}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor="trustDeviceGuard" 
                    className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2"
                  >
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    Trust this device
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Skip 2FA for 90 days on this browser
                  </p>
                </div>
              </div>

              <Button
                onClick={handleMfaVerification}
                className="w-full"
                disabled={mfaCode.length !== 6 || mfaLoading}
              >
                {mfaLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Verify & Continue
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full text-muted-foreground"
                disabled={mfaLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out instead
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              🔒 Your session requires verification for security
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // User has passed MFA check, render children
  return <>{children}</>;
}
