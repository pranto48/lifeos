-- Add unit_id to device_inventory for unit location tracking
ALTER TABLE public.device_inventory 
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.support_units(id) ON DELETE SET NULL;

-- Add device specifications fields for computers/laptops
ALTER TABLE public.device_inventory 
ADD COLUMN IF NOT EXISTS ram_info TEXT,
ADD COLUMN IF NOT EXISTS storage_info TEXT,
ADD COLUMN IF NOT EXISTS has_ups BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ups_info TEXT,
ADD COLUMN IF NOT EXISTS monitor_info TEXT,
ADD COLUMN IF NOT EXISTS webcam_info TEXT,
ADD COLUMN IF NOT EXISTS headset_info TEXT,
ADD COLUMN IF NOT EXISTS custom_specs JSONB;

-- Create index for unit_id lookups
CREATE INDEX IF NOT EXISTS idx_device_inventory_unit_id ON public.device_inventory(unit_id);

-- Update RLS policy to allow viewing with unit relationship
DROP POLICY IF EXISTS "All authenticated users can view device inventory" ON public.device_inventory;
CREATE POLICY "All authenticated users can view device inventory" 
ON public.device_inventory 
FOR SELECT 
USING (auth.uid() IS NOT NULL);