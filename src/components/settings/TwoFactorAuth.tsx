import { useState, useEffect } from 'react';
import { Smartphone, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function TwoFactorAuth() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    
    if (!error && data) {
      const totpFactor = data.totp.find(f => f.status === 'verified');
      setMfaEnabled(!!totpFactor);
      if (totpFactor) {
        setFactorId(totpFactor.id);
      }
    }
    setLoading(false);
  };

  const startEnrollment = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'LifeOS Authenticator'
    });

    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
      setEnrolling(false);
      return;
    }

    if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setShowEnrollDialog(true);
    }
    setEnrolling(false);
  };

  const verifyEnrollment = async () => {
    if (!factorId || verifyCode.length !== 6) {
      toast({ 
        title: 'Invalid Code', 
        description: 'Please enter a valid 6-digit code.', 
        variant: 'destructive' 
      });
      return;
    }

    setEnrolling(true);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId
    });

    if (challengeError) {
      toast({ 
        title: 'Error', 
        description: challengeError.message, 
        variant: 'destructive' 
      });
      setEnrolling(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode
    });

    if (verifyError) {
      toast({ 
        title: 'Verification Failed', 
        description: 'The code you entered is incorrect. Please try again.', 
        variant: 'destructive' 
      });
      setEnrolling(false);
      return;
    }

    toast({ 
      title: '2FA Enabled', 
      description: 'Two-factor authentication has been enabled successfully.' 
    });
    setMfaEnabled(true);
    setShowEnrollDialog(false);
    setVerifyCode('');
    setEnrolling(false);
  };

  const disableMfa = async () => {
    if (!factorId) return;

    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    } else {
      toast({ 
        title: '2FA Disabled', 
        description: 'Two-factor authentication has been disabled.' 
      });
      setMfaEnabled(false);
      setFactorId(null);
    }
    setLoading(false);
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Smartphone className="h-5 w-5" /> Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              mfaEnabled ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              {mfaEnabled ? (
                <Shield className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {mfaEnabled ? '2FA is enabled' : '2FA is not enabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                {mfaEnabled 
                  ? 'Your account is protected with an authenticator app.'
                  : 'Add an extra layer of security to your account using an authenticator app.'
                }
              </p>
            </div>
          </div>

          {mfaEnabled ? (
            <Button 
              variant="destructive" 
              onClick={disableMfa} 
              disabled={loading}
            >
              Disable 2FA
            </Button>
          ) : (
            <Button 
              onClick={startEnrollment} 
              disabled={loading || enrolling}
            >
              {enrolling ? 'Setting up...' : 'Enable 2FA'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Can't scan? Enter this code manually:
              </Label>
              <code className="block p-2 bg-muted/50 rounded text-xs font-mono break-all">
                {secret}
              </code>
            </div>

            <div className="space-y-2">
              <Label>Enter verification code</Label>
              <Input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="bg-muted/50 text-center text-lg tracking-widest"
              />
            </div>

            <Button 
              onClick={verifyEnrollment} 
              disabled={verifyCode.length !== 6 || enrolling}
              className="w-full"
            >
              {enrolling ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
