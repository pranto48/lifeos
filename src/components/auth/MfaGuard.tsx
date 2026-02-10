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
import { Loader2, Shield, KeyRound, Monitor, LogOut, Mail, Smartphone, ArrowLeft } from 'lucide-react';

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
  const [mfaMethod, setMfaMethod] = useState<'choose' | 'totp' | 'email'>('choose');
  const [hasEmailOtp, setHasEmailOtp] = useState(false);
  const [hasTotpFactor, setHasTotpFactor] = useState(false);
  const [emailOtpSending, setEmailOtpSending] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);

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
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorsData?.totp.find(f => f.status === 'verified');

      // Check email OTP setting
      const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('email_otp_enabled')
        .eq('user_id', user.id)
        .single();

      const emailOtpEnabled = mfaSettings?.email_otp_enabled || false;

      if (!verifiedFactor && !emailOtpEnabled) {
        setRequiresMfa(false);
        setChecking(false);
        return;
      }

      // Check AAL for TOTP
      if (verifiedFactor) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === 'aal2') {
          setRequiresMfa(false);
          setChecking(false);
          return;
        }
      }

      // Check trusted device
      const isDeviceTrusted = await checkTrustedDevice(user.id);
      if (isDeviceTrusted) {
        setRequiresMfa(false);
        setChecking(false);
        return;
      }

      // Needs MFA
      setHasTotpFactor(!!verifiedFactor);
      setHasEmailOtp(emailOtpEnabled);
      if (verifiedFactor) setMfaFactorId(verifiedFactor.id);

      // Determine initial method
      if (verifiedFactor && emailOtpEnabled) {
        setMfaMethod('choose');
      } else if (verifiedFactor) {
        setMfaMethod('totp');
      } else {
        setMfaMethod('email');
      }

      setRequiresMfa(true);
      setChecking(false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
      setChecking(false);
    }
  };

  const sendEmailOtp = async () => {
    setEmailOtpSending(true);
    try {
      const response = await supabase.functions.invoke('send-email-otp', {
        body: { action: 'send' },
      });
      if (response.error) {
        toast({ title: 'Error', description: 'Failed to send verification code.', variant: 'destructive' });
      } else {
        setEmailOtpSent(true);
        toast({ title: 'Code Sent', description: 'A 6-digit code has been sent to your email.' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send verification code.', variant: 'destructive' });
    }
    setEmailOtpSending(false);
  };

  const handleMfaVerification = async () => {
    if (mfaCode.length !== 6 || mfaLoading) return;

    setMfaLoading(true);
    try {
      if (mfaMethod === 'totp' && mfaFactorId) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        });
        if (challengeError) {
          toast({ title: 'Verification Failed', description: challengeError.message, variant: 'destructive' });
          return;
        }
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: mfaCode,
        });
        if (verifyError) {
          toast({ title: 'Invalid Code', description: 'The verification code is incorrect.', variant: 'destructive' });
          setMfaCode('');
          return;
        }
      } else if (mfaMethod === 'email') {
        const response = await supabase.functions.invoke('send-email-otp', {
          body: { action: 'verify', code: mfaCode },
        });
        if (response.error || !response.data?.verified) {
          toast({ title: 'Invalid Code', description: 'The verification code is incorrect or expired.', variant: 'destructive' });
          setMfaCode('');
          return;
        }
      }

      if (trustThisDevice && user) {
        await trustDevice(user.id);
      }

      toast({
        title: 'Verified!',
        description: trustThisDevice ? 'This device is now trusted for 90 days.' : 'Two-factor authentication verified.',
      });

      setRequiresMfa(false);
      setMfaCode('');
      setTrustThisDevice(false);
    } finally {
      setMfaLoading(false);
    }
  };

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (mfaCode.length === 6 && requiresMfa && (mfaMethod === 'totp' || mfaMethod === 'email') && !mfaLoading) {
      handleMfaVerification();
    }
  }, [mfaCode, requiresMfa, mfaMethod, mfaLoading]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

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

  if (requiresMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
            {/* Method chooser */}
            {mfaMethod === 'choose' && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Two-Factor Authentication</h2>
                  <p className="text-sm text-muted-foreground">Choose your verification method</p>
                </div>
                <div className="space-y-3">
                  {hasTotpFactor && (
                    <Button variant="outline" className="w-full h-14 justify-start gap-3" onClick={() => { setMfaMethod('totp'); setMfaCode(''); }}>
                      <Smartphone className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Authenticator App</p>
                        <p className="text-xs text-muted-foreground">6-digit code from your app</p>
                      </div>
                    </Button>
                  )}
                  {hasEmailOtp && (
                    <Button variant="outline" className="w-full h-14 justify-start gap-3" onClick={() => { setMfaMethod('email'); setMfaCode(''); sendEmailOtp(); }}>
                      <Mail className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">Email Code</p>
                        <p className="text-xs text-muted-foreground">6-digit code sent to your email</p>
                      </div>
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground">
                    <LogOut className="mr-2 h-4 w-4" /> Sign out instead
                  </Button>
                </div>
              </>
            )}

            {/* TOTP input */}
            {mfaMethod === 'totp' && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <KeyRound className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Authenticator Code</h2>
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} disabled={mfaLoading}>
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

                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <Checkbox id="trustDeviceGuard" checked={trustThisDevice} onCheckedChange={(checked) => setTrustThisDevice(checked === true)} disabled={mfaLoading} />
                    <div className="flex-1">
                      <Label htmlFor="trustDeviceGuard" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground" /> Trust this device
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Skip 2FA for 90 days on this browser</p>
                    </div>
                  </div>

                  <Button onClick={handleMfaVerification} className="w-full" disabled={mfaCode.length !== 6 || mfaLoading}>
                    {mfaLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>) : (<><Shield className="mr-2 h-4 w-4" />Verify & Continue</>)}
                  </Button>

                  {hasEmailOtp && (
                    <Button variant="ghost" onClick={() => { setMfaMethod('choose'); setMfaCode(''); }} className="w-full text-muted-foreground" disabled={mfaLoading}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Other methods
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground" disabled={mfaLoading}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out instead
                  </Button>
                </div>
              </>
            )}

            {/* Email OTP input */}
            {mfaMethod === 'email' && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Email Verification</h2>
                  <p className="text-sm text-muted-foreground">
                    {emailOtpSent ? 'Enter the 6-digit code sent to your email' : 'Sending verification code to your email...'}
                  </p>
                </div>
                <div className="space-y-4">
                  {emailOtpSending && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {emailOtpSent && !emailOtpSending && (
                    <>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode} disabled={mfaLoading}>
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

                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <Checkbox id="trustDeviceGuardEmail" checked={trustThisDevice} onCheckedChange={(checked) => setTrustThisDevice(checked === true)} disabled={mfaLoading} />
                        <div className="flex-1">
                          <Label htmlFor="trustDeviceGuardEmail" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-muted-foreground" /> Trust this device
                          </Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Skip 2FA for 90 days on this browser</p>
                        </div>
                      </div>

                      <Button onClick={handleMfaVerification} className="w-full" disabled={mfaCode.length !== 6 || mfaLoading}>
                        {mfaLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>) : (<><Shield className="mr-2 h-4 w-4" />Verify & Continue</>)}
                      </Button>

                      <Button variant="link" onClick={sendEmailOtp} className="w-full text-sm" disabled={emailOtpSending}>
                        Resend code
                      </Button>
                    </>
                  )}
                  {hasTotpFactor && (
                    <Button variant="ghost" onClick={() => { setMfaMethod('choose'); setMfaCode(''); }} className="w-full text-muted-foreground" disabled={mfaLoading}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Other methods
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground" disabled={mfaLoading}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out instead
                  </Button>
                </div>
              </>
            )}

            <p className="text-xs text-center text-muted-foreground mt-4">
              🔒 Your session requires verification for security
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return <>{children}</>;
}
