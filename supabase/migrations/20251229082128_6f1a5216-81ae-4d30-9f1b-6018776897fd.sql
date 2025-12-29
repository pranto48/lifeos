-- Create family_members table
CREATE TABLE public.family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_events table (birthdays, anniversaries, etc)
CREATE TABLE public.family_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'birthday',
  event_date DATE NOT NULL,
  reminder_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create family_documents table
CREATE TABLE public.family_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT DEFAULT 'general',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add family_member_id to transactions for expense tagging
ALTER TABLE public.transactions 
ADD COLUMN family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_members
CREATE POLICY "Users can CRUD own family_members"
ON public.family_members
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for family_events
CREATE POLICY "Users can CRUD own family_events"
ON public.family_events
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for family_documents
CREATE POLICY "Users can CRUD own family_documents"
ON public.family_documents
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_family_members_updated_at
BEFORE UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_events_updated_at
BEFORE UPDATE ON public.family_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_documents_updated_at
BEFORE UPDATE ON public.family_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_family_events_user_id ON public.family_events(user_id);
CREATE INDEX idx_family_events_event_date ON public.family_events(event_date);
CREATE INDEX idx_family_documents_user_id ON public.family_documents(user_id);
CREATE INDEX idx_transactions_family_member_id ON public.transactions(family_member_id);

-- Create storage bucket for family documents
INSERT INTO storage.buckets (id, name, public) VALUES ('family-documents', 'family-documents', false);

-- Storage policies for family documents
CREATE POLICY "Users can view own family documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own family documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own family documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own family documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'family-documents' AND auth.uid()::text = (storage.foldername(name))[1]);