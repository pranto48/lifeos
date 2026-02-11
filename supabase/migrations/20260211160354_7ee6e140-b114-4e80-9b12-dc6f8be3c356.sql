
-- Add follow-up fields to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS needs_follow_up boolean DEFAULT false;

-- Create task follow-up notes table
CREATE TABLE public.task_follow_up_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_follow_up_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can CRUD their own follow-up notes
CREATE POLICY "Users can view own follow-up notes"
  ON public.task_follow_up_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follow-up notes"
  ON public.task_follow_up_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own follow-up notes"
  ON public.task_follow_up_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own follow-up notes"
  ON public.task_follow_up_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_task_follow_up_notes_task_id ON public.task_follow_up_notes(task_id);
CREATE INDEX idx_tasks_follow_up_date ON public.tasks(follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX idx_tasks_needs_follow_up ON public.tasks(needs_follow_up) WHERE needs_follow_up = true;
