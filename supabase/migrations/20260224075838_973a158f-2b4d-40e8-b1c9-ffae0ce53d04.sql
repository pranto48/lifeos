
-- Remove the overly permissive SELECT policy
DROP POLICY IF EXISTS "All users can view support_users" ON public.support_users;

-- Add manager-only SELECT policy (they need full access including passwords)
CREATE POLICY "Managers can view support_users"
ON public.support_users FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'support_manager'::app_role));

-- Create a safe view without password fields for regular authenticated users
CREATE OR REPLACE VIEW public.support_users_safe AS
SELECT id, user_id, department_id, name, email, phone, designation,
       device_info, ip_address, notes, is_active, created_at, updated_at,
       extension_number, nas_username, device_handover_date,
       device_assign_date, new_device_assign
FROM public.support_users;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.support_users_safe TO authenticated;

-- Enable RLS on the view is not possible, but we secure via the underlying table
-- The view inherits the invoker's permissions, so non-managers won't be able to query it
-- unless we use SECURITY INVOKER (default). We need a security definer function instead.

-- Create an RPC function that returns safe support user data for any authenticated user
CREATE OR REPLACE FUNCTION public.get_support_users_safe()
RETURNS TABLE(
  id uuid, user_id uuid, department_id uuid, name text, email text, phone text,
  designation text, device_info text, ip_address text, notes text, is_active boolean,
  created_at timestamptz, updated_at timestamptz, extension_number text,
  nas_username text, device_handover_date date, device_assign_date date,
  new_device_assign text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.user_id, s.department_id, s.name, s.email, s.phone,
         s.designation, s.device_info, s.ip_address, s.notes, s.is_active,
         s.created_at, s.updated_at, s.extension_number,
         s.nas_username, s.device_handover_date, s.device_assign_date,
         s.new_device_assign
  FROM public.support_users s
  ORDER BY s.name;
$$;
