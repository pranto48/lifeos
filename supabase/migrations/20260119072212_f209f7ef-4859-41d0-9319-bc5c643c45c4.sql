-- Create support_user_devices table for multiple devices per user
CREATE TABLE public.support_user_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  support_user_id UUID NOT NULL REFERENCES public.support_users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_handover_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.support_user_devices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own support user devices" 
ON public.support_user_devices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own support user devices" 
ON public.support_user_devices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support user devices" 
ON public.support_user_devices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own support user devices" 
ON public.support_user_devices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updating updated_at
CREATE TRIGGER update_support_user_devices_updated_at
BEFORE UPDATE ON public.support_user_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();