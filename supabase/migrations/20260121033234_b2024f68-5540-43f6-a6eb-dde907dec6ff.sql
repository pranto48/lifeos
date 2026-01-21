-- Fix task_categories RLS: Allow all authenticated users to view all categories
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view admin task_categories" ON public.task_categories;
DROP POLICY IF EXISTS "Users can CRUD own non-admin task_categories" ON public.task_categories;
DROP POLICY IF EXISTS "Admins can manage all task_categories" ON public.task_categories;

-- Create new policies:

-- 1. All authenticated users can view ALL categories (both admin and user categories)
CREATE POLICY "All users can view all task_categories" 
ON public.task_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Users can create their own non-admin categories
CREATE POLICY "Users can create own task_categories" 
ON public.task_categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND is_admin_category = false);

-- 3. Users can update their own non-admin categories
CREATE POLICY "Users can update own task_categories" 
ON public.task_categories 
FOR UPDATE 
USING (auth.uid() = user_id AND is_admin_category = false);

-- 4. Users can delete their own non-admin categories
CREATE POLICY "Users can delete own task_categories" 
ON public.task_categories 
FOR DELETE 
USING (auth.uid() = user_id AND is_admin_category = false);

-- 5. Admins can insert categories (including admin categories)
CREATE POLICY "Admins can insert task_categories" 
ON public.task_categories 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Admins can update any category
CREATE POLICY "Admins can update any task_categories" 
ON public.task_categories 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admins can delete any category
CREATE POLICY "Admins can delete any task_categories" 
ON public.task_categories 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));