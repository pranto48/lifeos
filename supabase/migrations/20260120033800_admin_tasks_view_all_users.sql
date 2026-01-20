-- ============================================
-- ADMIN TASKS - ALLOW VIEWING ALL USERS
-- ============================================

-- Add is_admin_task column to track tasks in admin categories
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_admin_task BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_is_admin_task ON public.tasks(is_admin_task);

-- Drop existing tasks RLS policies
DROP POLICY IF EXISTS "Users can CRUD own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- Create new comprehensive RLS policies for tasks

-- 1. SELECT Policy: Users can view their own tasks AND all admin tasks (read-only)
CREATE POLICY "Users can view own and admin tasks"
ON public.tasks
FOR SELECT
USING (
  auth.uid() = user_id OR  -- Own tasks
  is_admin_task = true      -- All admin tasks (read-only for non-admins)
);

-- 2. INSERT Policy: Users can only insert their own tasks
-- Admins can insert tasks and mark them as admin tasks
CREATE POLICY "Users can insert own tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    -- Regular users cannot create admin tasks
    (NOT has_role(auth.uid(), 'admin'::app_role) AND is_admin_task = false) OR
    -- Admins can create both regular and admin tasks
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 3. UPDATE Policy: Users can only update their own non-admin tasks
-- Admins can update any admin task
CREATE POLICY "Users can update own non-admin tasks"
ON public.tasks
FOR UPDATE
USING (
  -- Own non-admin tasks
  (auth.uid() = user_id AND is_admin_task = false) OR
  -- Admins can update any admin task
  (has_role(auth.uid(), 'admin'::app_role) AND is_admin_task = true)
)
WITH CHECK (
  -- Ensure users don't change ownership or admin status inappropriately
  (auth.uid() = user_id AND is_admin_task = false) OR
  (has_role(auth.uid(), 'admin'::app_role) AND is_admin_task = true)
);

-- 4. DELETE Policy: Users can only delete their own non-admin tasks
-- Admins can delete any admin task
CREATE POLICY "Users can delete own non-admin tasks"
ON public.tasks
FOR DELETE
USING (
  -- Own non-admin tasks
  (auth.uid() = user_id AND is_admin_task = false) OR
  -- Admins can delete any admin task
  (has_role(auth.uid(), 'admin'::app_role) AND is_admin_task = true)
);

-- ============================================
-- TRIGGER TO AUTO-SET is_admin_task FLAG
-- ============================================

-- Function to automatically set is_admin_task based on category
CREATE OR REPLACE FUNCTION public.set_is_admin_task()
RETURNS TRIGGER AS $$
BEGIN
  -- If task has a category, check if it's an admin category
  IF NEW.category_id IS NOT NULL THEN
    SELECT is_admin_category INTO NEW.is_admin_task
    FROM public.task_categories
    WHERE id = NEW.category_id;
    
    -- If category not found, default to false
    IF NEW.is_admin_task IS NULL THEN
      NEW.is_admin_task := false;
    END IF;
  ELSE
    -- No category means it's a personal task
    NEW.is_admin_task := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that runs before INSERT or UPDATE
DROP TRIGGER IF EXISTS set_is_admin_task_trigger ON public.tasks;
CREATE TRIGGER set_is_admin_task_trigger
  BEFORE INSERT OR UPDATE OF category_id
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_is_admin_task();

-- ============================================
-- UPDATE EXISTING TASKS
-- ============================================

-- Update existing tasks to set is_admin_task flag based on their category
UPDATE public.tasks t
SET is_admin_task = COALESCE(
  (SELECT tc.is_admin_category 
   FROM public.task_categories tc 
   WHERE tc.id = t.category_id),
  false
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN public.tasks.is_admin_task IS 'Flag indicating if this task belongs to an admin category. Admin tasks are visible to all users but only editable by admins.';
COMMENT ON POLICY "Users can view own and admin tasks" ON public.tasks IS 'Users can view their own tasks and all admin tasks (read-only for regular users)';
COMMENT ON POLICY "Users can update own non-admin tasks" ON public.tasks IS 'Users can only update their own non-admin tasks. Admins can update any admin task.';
COMMENT ON POLICY "Users can delete own non-admin tasks" ON public.tasks IS 'Users can only delete their own non-admin tasks. Admins can delete any admin task.';
