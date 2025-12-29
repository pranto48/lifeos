-- Create table for family member connections/relationships
CREATE TABLE public.family_member_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id_1 UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  member_id_2 UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'spouse',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_members CHECK (member_id_1 != member_id_2),
  CONSTRAINT unique_connection UNIQUE (user_id, member_id_1, member_id_2, connection_type)
);

-- Enable RLS
ALTER TABLE public.family_member_connections ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can CRUD own family_member_connections" 
ON public.family_member_connections 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_family_member_connections_updated_at
BEFORE UPDATE ON public.family_member_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();