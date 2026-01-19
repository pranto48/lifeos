-- Create task_assignments table to track task assignments between users
CREATE TABLE public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  assigned_to UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments they created or received
CREATE POLICY "Users can view own assignments"
ON public.task_assignments
FOR SELECT
USING (auth.uid() = assigned_by OR auth.uid() = assigned_to);

-- Policy: Users can create assignments for their own tasks
CREATE POLICY "Users can create assignments for own tasks"
ON public.task_assignments
FOR INSERT
WITH CHECK (
  auth.uid() = assigned_by AND
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND user_id = auth.uid())
);

-- Policy: Assignees can update assignment status (accept/reject)
CREATE POLICY "Assignees can respond to assignments"
ON public.task_assignments
FOR UPDATE
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Policy: Task owners can delete their assignments
CREATE POLICY "Task owners can delete assignments"
ON public.task_assignments
FOR DELETE
USING (auth.uid() = assigned_by);

-- Create trigger for updating updated_at
CREATE TRIGGER update_task_assignments_updated_at
BEFORE UPDATE ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_task_assignments_assigned_to ON public.task_assignments(assigned_to);
CREATE INDEX idx_task_assignments_assigned_by ON public.task_assignments(assigned_by);
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_status ON public.task_assignments(status);