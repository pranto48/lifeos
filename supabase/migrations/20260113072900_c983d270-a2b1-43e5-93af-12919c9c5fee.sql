-- Create task_categories table
CREATE TABLE public.task_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT DEFAULT 'Folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can CRUD own task_categories"
ON public.task_categories
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add category_id to tasks table
ALTER TABLE public.tasks ADD COLUMN category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_task_categories_updated_at
BEFORE UPDATE ON public.task_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_task_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_categories (user_id, name, color, icon) VALUES
    (NEW.id, 'Work', '#3b82f6', 'Briefcase'),
    (NEW.id, 'Personal', '#22c55e', 'User'),
    (NEW.id, 'Meeting', '#f97316', 'Users'),
    (NEW.id, 'Research', '#8b5cf6', 'Search'),
    (NEW.id, 'Planning', '#ec4899', 'Calendar'),
    (NEW.id, 'Review', '#14b8a6', 'CheckCircle');
  RETURN NEW;
END;
$$;

-- Create trigger for seeding categories on new user signup
CREATE TRIGGER seed_task_categories_on_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_task_categories();