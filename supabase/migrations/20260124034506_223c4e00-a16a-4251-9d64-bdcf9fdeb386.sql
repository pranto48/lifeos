-- Create device transfer history table to track assignments
CREATE TABLE public.device_transfer_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.device_inventory(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL,
  transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  transferred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_transfer_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - all authenticated users can view
CREATE POLICY "Authenticated users can view transfer history"
ON public.device_transfer_history
FOR SELECT
TO authenticated
USING (true);

-- Only admins and inventory managers can insert
CREATE POLICY "Admins and inventory managers can insert transfer history"
ON public.device_transfer_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'inventory_manager')
);

-- Create index for faster lookups
CREATE INDEX idx_device_transfer_history_device_id ON public.device_transfer_history(device_id);
CREATE INDEX idx_device_transfer_history_transfer_date ON public.device_transfer_history(transfer_date DESC);