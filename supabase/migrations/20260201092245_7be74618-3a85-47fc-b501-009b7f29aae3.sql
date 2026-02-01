-- Add category_type column to task_categories for Office/Personal separation
ALTER TABLE public.task_categories 
ADD COLUMN category_type TEXT NOT NULL DEFAULT 'office';

-- Add check constraint for valid values
ALTER TABLE public.task_categories 
ADD CONSTRAINT task_categories_type_check 
CHECK (category_type IN ('office', 'personal'));

-- Create index for faster filtering
CREATE INDEX idx_task_categories_type ON public.task_categories(category_type);