-- Create table to store trusted devices per user
CREATE TABLE public.trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  device_info TEXT,
  trusted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_device UNIQUE(user_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can only view their own trusted devices
CREATE POLICY "Users can view their own trusted devices"
  ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add their own trusted devices
CREATE POLICY "Users can add their own trusted devices"
  ON public.trusted_devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own trusted devices
CREATE POLICY "Users can delete their own trusted devices"
  ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update their own trusted devices
CREATE POLICY "Users can update their own trusted devices"
  ON public.trusted_devices FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_expires_at ON public.trusted_devices(expires_at);

-- Add mfa_last_verified column to user_sessions for 3-month expiry tracking
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mfa_expires_at TIMESTAMP WITH TIME ZONE;