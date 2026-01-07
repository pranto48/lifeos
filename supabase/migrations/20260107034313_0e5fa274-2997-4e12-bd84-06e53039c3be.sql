-- Add goal_type column to goals table for office/personal separation
ALTER TABLE public.goals 
ADD COLUMN goal_type text NOT NULL DEFAULT 'office'::text;

-- Create index for faster filtering
CREATE INDEX idx_goals_goal_type ON public.goals(goal_type);