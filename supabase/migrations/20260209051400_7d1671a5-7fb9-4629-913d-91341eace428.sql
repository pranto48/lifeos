
-- Fix ticket_requesters RLS: allow anyone to check their own email and upsert
DROP POLICY IF EXISTS "Admins can view all requesters" ON public.ticket_requesters;
DROP POLICY IF EXISTS "Admins can update requesters" ON public.ticket_requesters;
DROP POLICY IF EXISTS "Admins can delete requesters" ON public.ticket_requesters;
DROP POLICY IF EXISTS "Anyone can register as requester" ON public.ticket_requesters;

-- Allow anyone to view requesters (needed for ticket submission lookup)
CREATE POLICY "Anyone can view requesters"
ON public.ticket_requesters FOR SELECT
USING (true);

-- Allow anyone to insert (public ticket submission)
CREATE POLICY "Anyone can create requester"
ON public.ticket_requesters FOR INSERT
WITH CHECK (true);

-- Allow anyone to update requesters (for name/phone updates during submission)
CREATE POLICY "Anyone can update requester"
ON public.ticket_requesters FOR UPDATE
USING (true);

-- Only admins can delete
CREATE POLICY "Admins can delete requesters"
ON public.ticket_requesters FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Make ticket_requesters foreign keys optional (support_user_id and device_id may not always exist)
-- Drop existing foreign key constraints if they exist, then re-add as proper optional references
DO $$
BEGIN
  -- Check and add FK for support_user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_requesters_support_user_id_fkey'
    AND table_name = 'ticket_requesters'
  ) THEN
    BEGIN
      ALTER TABLE public.ticket_requesters
        ADD CONSTRAINT ticket_requesters_support_user_id_fkey
        FOREIGN KEY (support_user_id) REFERENCES public.support_users(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Check and add FK for device_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_requesters_device_id_fkey'
    AND table_name = 'ticket_requesters'
  ) THEN
    BEGIN
      ALTER TABLE public.ticket_requesters
        ADD CONSTRAINT ticket_requesters_device_id_fkey
        FOREIGN KEY (device_id) REFERENCES public.device_inventory(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Ensure support_tickets foreign keys are properly set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_tickets_requester_id_fkey'
    AND table_name = 'support_tickets'
  ) THEN
    BEGIN
      ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_requester_id_fkey
        FOREIGN KEY (requester_id) REFERENCES public.ticket_requesters(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_tickets_device_id_fkey'
    AND table_name = 'support_tickets'
  ) THEN
    BEGIN
      ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_device_id_fkey
        FOREIGN KEY (device_id) REFERENCES public.device_inventory(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'support_tickets_category_id_fkey'
    AND table_name = 'support_tickets'
  ) THEN
    BEGIN
      ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.ticket_categories(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Ensure ticket_comments foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_comments_ticket_id_fkey'
    AND table_name = 'ticket_comments'
  ) THEN
    BEGIN
      ALTER TABLE public.ticket_comments
        ADD CONSTRAINT ticket_comments_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Ensure ticket_activity_log foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_activity_log_ticket_id_fkey'
    AND table_name = 'ticket_activity_log'
  ) THEN
    BEGIN
      ALTER TABLE public.ticket_activity_log
        ADD CONSTRAINT ticket_activity_log_ticket_id_fkey
        FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
