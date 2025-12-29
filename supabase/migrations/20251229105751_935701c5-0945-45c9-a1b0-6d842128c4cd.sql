-- Drop existing policies on audit_logs
DROP POLICY IF EXISTS "Users can insert own audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view own audit_logs" ON public.audit_logs;

-- Create stricter policies that are authenticated-only
CREATE POLICY "Users can view own audit_logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit_logs" 
ON public.audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);