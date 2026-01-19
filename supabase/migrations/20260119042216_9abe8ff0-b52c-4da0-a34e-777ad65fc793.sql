-- Create user workspace permissions table
CREATE TABLE public.user_workspace_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  office_enabled BOOLEAN NOT NULL DEFAULT true,
  personal_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_workspace_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage workspace permissions"
ON public.user_workspace_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view own workspace permissions"
ON public.user_workspace_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_workspace_permissions_updated_at
BEFORE UPDATE ON public.user_workspace_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();