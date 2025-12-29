-- Remove the foreign key constraint on budget_categories that references auth.users
-- This constraint causes signup failures because the seed_default_categories trigger
-- runs before the auth.users record is fully committed
ALTER TABLE public.budget_categories 
DROP CONSTRAINT IF EXISTS budget_categories_user_id_fkey;