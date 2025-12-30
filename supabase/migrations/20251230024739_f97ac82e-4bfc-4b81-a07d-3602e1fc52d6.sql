-- Add explicit policy to deny public/anonymous access to profiles table
-- This ensures that even if RLS is somehow misconfigured, anonymous users cannot access any data

-- First, let's ensure we have a policy that explicitly blocks anonymous access
-- The existing policies use auth.uid() = user_id which already blocks anon,
-- but we'll add an extra layer of security by ensuring the role is 'authenticated'

-- Drop and recreate the SELECT policy to be more explicit
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Drop and recreate the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate the UPDATE policy to be more explicit
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate the DELETE policy to be more explicit
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);