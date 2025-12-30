-- Create a table to store the edge function secret
CREATE TABLE public.app_secrets (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow service role access
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
-- This ensures only edge functions with service role can read the secret

-- Insert a randomly generated edge function secret
INSERT INTO public.app_secrets (id, value) 
VALUES ('edge_function_secret', encode(gen_random_bytes(32), 'hex'));