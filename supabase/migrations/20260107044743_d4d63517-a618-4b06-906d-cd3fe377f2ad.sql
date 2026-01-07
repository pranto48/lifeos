-- Add project_type column to projects table
ALTER TABLE public.projects 
ADD COLUMN project_type TEXT NOT NULL DEFAULT 'office';