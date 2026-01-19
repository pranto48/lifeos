-- Add new columns to support_users table for device and credential management
ALTER TABLE public.support_users
ADD COLUMN extension_number TEXT,
ADD COLUMN extension_password TEXT,
ADD COLUMN mail_password TEXT,
ADD COLUMN nas_username TEXT,
ADD COLUMN nas_password TEXT,
ADD COLUMN device_handover_date DATE,
ADD COLUMN new_device_assign TEXT,
ADD COLUMN device_assign_date DATE;