-- Add reminder fields to habits table
ALTER TABLE public.habits 
ADD COLUMN reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN reminder_time TIME DEFAULT '08:00:00';

-- Add user email to profiles if not exists (for sending reminders)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;