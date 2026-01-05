-- Add task_type column to distinguish office and personal tasks
ALTER TABLE public.tasks 
ADD COLUMN task_type TEXT NOT NULL DEFAULT 'office' CHECK (task_type IN ('office', 'personal'));

-- Update existing tasks to be office by default
UPDATE public.tasks SET task_type = 'office' WHERE task_type IS NULL;