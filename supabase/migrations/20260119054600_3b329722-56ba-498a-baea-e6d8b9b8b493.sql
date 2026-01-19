-- Add message column to task_assignments for assignment context
ALTER TABLE public.task_assignments 
ADD COLUMN message TEXT;