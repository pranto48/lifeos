
-- Create device_disposals table for tracking disposal details
CREATE TABLE public.device_disposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.device_inventory(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  disposal_date date NOT NULL DEFAULT CURRENT_DATE,
  disposal_method text NOT NULL DEFAULT 'recycled',
  disposal_reason text,
  approved_by text,
  certificate_number text,
  disposal_value numeric,
  buyer_info text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_disposals ENABLE ROW LEVEL SECURITY;

-- RLS policies - same as device_inventory
CREATE POLICY "All authenticated users can view disposals"
  ON public.device_disposals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can insert disposals"
  ON public.device_disposals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

CREATE POLICY "Managers can update disposals"
  ON public.device_disposals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

CREATE POLICY "Managers can delete disposals"
  ON public.device_disposals FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'inventory_manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_device_disposals_updated_at
  BEFORE UPDATE ON public.device_disposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
