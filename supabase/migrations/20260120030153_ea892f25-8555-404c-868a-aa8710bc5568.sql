-- Fix RLS policies for support tables and device tables
-- Allow all authenticated users to VIEW data, but only admin can modify

-- =============================================
-- SUPPORT UNITS
-- =============================================
DROP POLICY IF EXISTS "Users can CRUD own support_units" ON public.support_units;

-- All authenticated users can view all support units
CREATE POLICY "All users can view support_units" 
ON public.support_units FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can insert support units
CREATE POLICY "Admins can insert support_units" 
ON public.support_units FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update support units
CREATE POLICY "Admins can update support_units" 
ON public.support_units FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete support units
CREATE POLICY "Admins can delete support_units" 
ON public.support_units FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SUPPORT DEPARTMENTS
-- =============================================
DROP POLICY IF EXISTS "Users can CRUD own support_departments" ON public.support_departments;

-- All authenticated users can view all support departments
CREATE POLICY "All users can view support_departments" 
ON public.support_departments FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can insert support departments
CREATE POLICY "Admins can insert support_departments" 
ON public.support_departments FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update support departments
CREATE POLICY "Admins can update support_departments" 
ON public.support_departments FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete support departments
CREATE POLICY "Admins can delete support_departments" 
ON public.support_departments FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SUPPORT USERS
-- =============================================
DROP POLICY IF EXISTS "Users can CRUD own support_users" ON public.support_users;

-- All authenticated users can view all support users
CREATE POLICY "All users can view support_users" 
ON public.support_users FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can insert support users
CREATE POLICY "Admins can insert support_users" 
ON public.support_users FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update support users
CREATE POLICY "Admins can update support_users" 
ON public.support_users FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete support users
CREATE POLICY "Admins can delete support_users" 
ON public.support_users FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- DEVICE CATEGORIES
-- =============================================
DROP POLICY IF EXISTS "Users can CRUD own device_categories" ON public.device_categories;

-- All authenticated users can view all device categories
CREATE POLICY "All users can view device_categories" 
ON public.device_categories FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can insert device categories
CREATE POLICY "Admins can insert device_categories" 
ON public.device_categories FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update device categories
CREATE POLICY "Admins can update device_categories" 
ON public.device_categories FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete device categories
CREATE POLICY "Admins can delete device_categories" 
ON public.device_categories FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- DEVICE INVENTORY
-- =============================================
DROP POLICY IF EXISTS "Users can CRUD own device_inventory" ON public.device_inventory;

-- All authenticated users can view all device inventory
CREATE POLICY "All users can view device_inventory" 
ON public.device_inventory FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can insert devices
CREATE POLICY "Admins can insert device_inventory" 
ON public.device_inventory FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update devices
CREATE POLICY "Admins can update device_inventory" 
ON public.device_inventory FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete devices
CREATE POLICY "Admins can delete device_inventory" 
ON public.device_inventory FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- DEVICE SERVICE HISTORY
-- =============================================
DROP POLICY IF EXISTS "Users can CRUD own device_service_history" ON public.device_service_history;

-- All authenticated users can view all device service history
CREATE POLICY "All users can view device_service_history" 
ON public.device_service_history FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can insert service records
CREATE POLICY "Admins can insert device_service_history" 
ON public.device_service_history FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update service records
CREATE POLICY "Admins can update device_service_history" 
ON public.device_service_history FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete service records
CREATE POLICY "Admins can delete device_service_history" 
ON public.device_inventory FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));