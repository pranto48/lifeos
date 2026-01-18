-- Add RLS policies to app_secrets table to deny all direct access
-- Only service role (edge functions) should access this table

-- Enable RLS if not already enabled
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- Deny all access to app_secrets table for regular users
-- The service role key used by edge functions bypasses RLS
-- This ensures secrets are only accessible via edge functions

-- No SELECT policy = users cannot read secrets
-- No INSERT policy = users cannot add secrets directly
-- No UPDATE policy = users cannot update secrets directly  
-- No DELETE policy = users cannot delete secrets directly

-- All operations on this table must go through edge functions
-- which use the service role key to bypass RLS