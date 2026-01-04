-- Add sort_order column to tasks table for drag-and-drop reordering
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update existing tasks with sort_order based on created_at
UPDATE public.tasks SET sort_order = subquery.rn 
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn 
  FROM public.tasks
) as subquery 
WHERE public.tasks.id = subquery.id AND public.tasks.sort_order = 0;