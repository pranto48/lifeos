-- Add note_type column to distinguish office and personal notes
ALTER TABLE public.notes 
ADD COLUMN note_type TEXT NOT NULL DEFAULT 'office' CHECK (note_type IN ('office', 'personal'));

-- Update existing notes to be office by default
UPDATE public.notes SET note_type = 'office' WHERE note_type IS NULL;