-- Create table for storing WebAuthn credentials
CREATE TABLE public.user_webauthn_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_type TEXT,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  friendly_name TEXT,
  UNIQUE(credential_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own webauthn credentials" 
ON public.user_webauthn_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webauthn credentials" 
ON public.user_webauthn_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webauthn credentials" 
ON public.user_webauthn_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webauthn credentials" 
ON public.user_webauthn_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster credential lookups
CREATE INDEX idx_webauthn_credential_id ON public.user_webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_user_id ON public.user_webauthn_credentials(user_id);