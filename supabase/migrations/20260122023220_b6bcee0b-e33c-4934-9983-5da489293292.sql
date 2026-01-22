-- Add device_number column to device_inventory
ALTER TABLE public.device_inventory ADD COLUMN IF NOT EXISTS device_number TEXT;

-- Create index on device_number for quick lookups
CREATE INDEX IF NOT EXISTS idx_device_inventory_device_number ON public.device_inventory(device_number);

-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inventory_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_manager';