-- Add entity linking columns to transactions table for Goals, Tasks, Projects, Notes, Habits integration
ALTER TABLE public.transactions 
ADD COLUMN linked_entity_type text,
ADD COLUMN linked_entity_id uuid;

-- Add check constraint for valid entity types
ALTER TABLE public.transactions 
ADD CONSTRAINT valid_linked_entity_type 
CHECK (linked_entity_type IS NULL OR linked_entity_type IN ('goal', 'task', 'project', 'note', 'habit'));

-- Create index for faster lookups
CREATE INDEX idx_transactions_linked_entity ON public.transactions(linked_entity_type, linked_entity_id);

COMMENT ON COLUMN public.transactions.linked_entity_type IS 'Type of linked entity: goal, task, project, note, or habit';
COMMENT ON COLUMN public.transactions.linked_entity_id IS 'ID of the linked entity';