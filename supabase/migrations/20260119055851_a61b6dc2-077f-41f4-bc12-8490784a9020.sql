-- Add RLS policy to allow assigned users to view tasks they've been assigned
CREATE POLICY "Assignees can view assigned tasks" 
ON public.tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_assignments.task_id = tasks.id 
    AND task_assignments.assigned_to = auth.uid()
  )
);

-- Also allow assigners to read their profiles (for the assigner info display)
CREATE POLICY "Users can view profiles of people who assigned them tasks" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_assignments.assigned_by = profiles.user_id 
    AND task_assignments.assigned_to = auth.uid()
  )
);

-- Allow viewing profiles of users who you've assigned tasks to (for outgoing assignments)
CREATE POLICY "Users can view profiles of people they assigned tasks to" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE task_assignments.assigned_to = profiles.user_id 
    AND task_assignments.assigned_by = auth.uid()
  )
);