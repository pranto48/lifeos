-- Create backup_schedules table
CREATE TABLE public.backup_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
  last_backup_at TIMESTAMP WITH TIME ZONE,
  next_backup_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own backup schedules"
  ON public.backup_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backup schedules"
  ON public.backup_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup schedules"
  ON public.backup_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup schedules"
  ON public.backup_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_backup_schedules_updated_at
  BEFORE UPDATE ON public.backup_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create google_calendar_sync table
CREATE TABLE public.google_calendar_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own google calendar sync"
  ON public.google_calendar_sync FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own google calendar sync"
  ON public.google_calendar_sync FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own google calendar sync"
  ON public.google_calendar_sync FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google calendar sync"
  ON public.google_calendar_sync FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_google_calendar_sync_updated_at
  BEFORE UPDATE ON public.google_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create synced_calendar_events table to track sync status
CREATE TABLE public.synced_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  local_event_id TEXT NOT NULL,
  local_event_type TEXT NOT NULL CHECK (local_event_type IN ('task', 'goal', 'family_event')),
  google_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_event_id, local_event_type)
);

-- Enable RLS
ALTER TABLE public.synced_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own synced events"
  ON public.synced_calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own synced events"
  ON public.synced_calendar_events FOR ALL
  USING (auth.uid() = user_id);