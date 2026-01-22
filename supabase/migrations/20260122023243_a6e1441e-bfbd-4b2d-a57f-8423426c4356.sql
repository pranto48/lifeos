-- Update RLS policies for device_inventory to allow inventory_manager role
DROP POLICY IF EXISTS "Admins can insert device_inventory" ON public.device_inventory;
DROP POLICY IF EXISTS "Admins can update device_inventory" ON public.device_inventory;
DROP POLICY IF EXISTS "Admins can delete device_inventory" ON public.device_inventory;

CREATE POLICY "Managers can insert device_inventory" 
ON public.device_inventory FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Managers can update device_inventory" 
ON public.device_inventory FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Managers can delete device_inventory" 
ON public.device_inventory FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

-- Update RLS policies for device_categories
DROP POLICY IF EXISTS "Admins can insert device_categories" ON public.device_categories;
DROP POLICY IF EXISTS "Admins can update device_categories" ON public.device_categories;
DROP POLICY IF EXISTS "Admins can delete device_categories" ON public.device_categories;

CREATE POLICY "Managers can insert device_categories" 
ON public.device_categories FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Managers can update device_categories" 
ON public.device_categories FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Managers can delete device_categories" 
ON public.device_categories FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

-- Update RLS policies for device_service_history
DROP POLICY IF EXISTS "Admins can insert device_service_history" ON public.device_service_history;
DROP POLICY IF EXISTS "Admins can update device_service_history" ON public.device_service_history;
DROP POLICY IF EXISTS "Admins can delete device_service_history" ON public.device_service_history;

CREATE POLICY "Managers can insert device_service_history" 
ON public.device_service_history FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Managers can update device_service_history" 
ON public.device_service_history FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

CREATE POLICY "Managers can delete device_service_history" 
ON public.device_service_history FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'inventory_manager')
);

-- Update RLS policies for support entities to allow support_manager role
DROP POLICY IF EXISTS "Admins can insert support_units" ON public.support_units;
DROP POLICY IF EXISTS "Admins can update support_units" ON public.support_units;
DROP POLICY IF EXISTS "Admins can delete support_units" ON public.support_units;

CREATE POLICY "Managers can insert support_units" 
ON public.support_units FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

CREATE POLICY "Managers can update support_units" 
ON public.support_units FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

CREATE POLICY "Managers can delete support_units" 
ON public.support_units FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

-- Support departments
DROP POLICY IF EXISTS "Admins can insert support_departments" ON public.support_departments;
DROP POLICY IF EXISTS "Admins can update support_departments" ON public.support_departments;
DROP POLICY IF EXISTS "Admins can delete support_departments" ON public.support_departments;

CREATE POLICY "Managers can insert support_departments" 
ON public.support_departments FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

CREATE POLICY "Managers can update support_departments" 
ON public.support_departments FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

CREATE POLICY "Managers can delete support_departments" 
ON public.support_departments FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

-- Support users
DROP POLICY IF EXISTS "Admins can insert support_users" ON public.support_users;
DROP POLICY IF EXISTS "Admins can update support_users" ON public.support_users;
DROP POLICY IF EXISTS "Admins can delete support_users" ON public.support_users;

CREATE POLICY "Managers can insert support_users" 
ON public.support_users FOR INSERT 
TO authenticated 
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

CREATE POLICY "Managers can update support_users" 
ON public.support_users FOR UPDATE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);

CREATE POLICY "Managers can delete support_users" 
ON public.support_users FOR DELETE 
TO authenticated 
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'support_manager')
);