
-- Table to store temporary email OTP codes
CREATE TABLE public.email_otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_otp_codes ENABLE ROW LEVEL SECURITY;

-- Users can only read their own OTP codes
CREATE POLICY "Users can view their own OTP codes"
ON public.email_otp_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role inserts (via edge function), no user insert policy needed
-- Cleanup: auto-delete expired codes
CREATE INDEX idx_email_otp_codes_user_expires ON public.email_otp_codes (user_id, expires_at);
CREATE INDEX idx_email_otp_codes_cleanup ON public.email_otp_codes (expires_at) WHERE used = false;

-- Table to store user MFA method preferences
CREATE TABLE public.user_mfa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_otp_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own MFA settings
CREATE POLICY "Users can view their own MFA settings"
ON public.user_mfa_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MFA settings"
ON public.user_mfa_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MFA settings"
ON public.user_mfa_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_mfa_settings_updated_at
BEFORE UPDATE ON public.user_mfa_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
