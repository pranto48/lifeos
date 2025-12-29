import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyEvent {
  id: string;
  user_id: string;
  family_member_id: string | null;
  title: string;
  event_type: string;
  event_date: string;
  reminder_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  family_member?: FamilyMember;
}

export interface FamilyDocument {
  id: string;
  user_id: string;
  family_member_id: string | null;
  title: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  family_member?: FamilyMember;
}

export interface FamilyConnection {
  id: string;
  user_id: string;
  member_id_1: string;
  member_id_2: string;
  connection_type: 'spouse' | 'parent_child' | 'sibling';
  created_at: string;
  updated_at: string;
  member_1?: FamilyMember;
  member_2?: FamilyMember;
}

export function useFamily() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Family Members
  const membersQuery = useQuery({
    queryKey: ['family_members', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as FamilyMember[];
    },
    enabled: !!user?.id,
  });

  // Family Events
  const eventsQuery = useQuery({
    queryKey: ['family_events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_events')
        .select('*, family_member:family_members(*)')
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as FamilyEvent[];
    },
    enabled: !!user?.id,
  });

  // Family Documents
  const documentsQuery = useQuery({
    queryKey: ['family_documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_documents')
        .select('*, family_member:family_members(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FamilyDocument[];
    },
    enabled: !!user?.id,
  });

  // Family Connections
  const connectionsQuery = useQuery({
    queryKey: ['family_connections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_member_connections')
        .select('*, member_1:family_members!member_id_1(*), member_2:family_members!member_id_2(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FamilyConnection[];
    },
    enabled: !!user?.id,
  });

  // Member mutations
  const createMember = useMutation({
    mutationFn: async (member: Partial<FamilyMember> & { createBirthdayEvent?: boolean }) => {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          user_id: user!.id,
          name: member.name!,
          relationship: member.relationship!,
          date_of_birth: member.date_of_birth,
          notes: member.notes,
          avatar_url: member.avatar_url,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create birthday event if date_of_birth is provided
      if (member.date_of_birth && data) {
        await supabase
          .from('family_events')
          .insert({
            user_id: user!.id,
            family_member_id: data.id,
            title: `${member.name}'s Birthday`,
            event_type: 'birthday',
            event_date: member.date_of_birth,
            reminder_days: 7,
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_members'] });
      queryClient.invalidateQueries({ queryKey: ['family_events'] });
      toast.success('Family member added!');
    },
    onError: (error) => {
      toast.error('Failed to add family member');
      console.error(error);
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FamilyMember> & { id: string }) => {
      const { data, error } = await supabase
        .from('family_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_members'] });
      queryClient.invalidateQueries({ queryKey: ['family_events'] });
      toast.success('Family member updated!');
    },
    onError: (error) => {
      toast.error('Failed to update family member');
      console.error(error);
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_members'] });
      queryClient.invalidateQueries({ queryKey: ['family_events'] });
      queryClient.invalidateQueries({ queryKey: ['family_documents'] });
      toast.success('Family member removed');
    },
    onError: (error) => {
      toast.error('Failed to remove family member');
      console.error(error);
    },
  });

  // Event mutations
  const createEvent = useMutation({
    mutationFn: async (event: Partial<FamilyEvent>) => {
      const { data, error } = await supabase
        .from('family_events')
        .insert({
          user_id: user!.id,
          family_member_id: event.family_member_id,
          title: event.title!,
          event_type: event.event_type || 'birthday',
          event_date: event.event_date!,
          reminder_days: event.reminder_days || 7,
          notes: event.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_events'] });
      toast.success('Event added!');
    },
    onError: (error) => {
      toast.error('Failed to add event');
      console.error(error);
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FamilyEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('family_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_events'] });
      toast.success('Event updated!');
    },
    onError: (error) => {
      toast.error('Failed to update event');
      console.error(error);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_events'] });
      toast.success('Event deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete event');
      console.error(error);
    },
  });

  // Document mutations
  const uploadDocument = useMutation({
    mutationFn: async ({ file, document }: { file: File; document: Partial<FamilyDocument> }) => {
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('family-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('family-documents')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('family_documents')
        .insert({
          user_id: user!.id,
          family_member_id: document.family_member_id,
          title: document.title!,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          category: document.category || 'general',
          notes: document.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_documents'] });
      toast.success('Document uploaded!');
    },
    onError: (error) => {
      toast.error('Failed to upload document');
      console.error(error);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: FamilyDocument) => {
      // Extract file path from URL
      const urlParts = doc.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      await supabase.storage
        .from('family-documents')
        .remove([filePath]);

      const { error } = await supabase
        .from('family_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete document');
      console.error(error);
    },
  });

  // Connection mutations
  const createConnection = useMutation({
    mutationFn: async (connection: { member_id_1: string; member_id_2: string; connection_type: string }) => {
      const { data, error } = await supabase
        .from('family_member_connections')
        .insert({
          user_id: user!.id,
          member_id_1: connection.member_id_1,
          member_id_2: connection.member_id_2,
          connection_type: connection.connection_type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_connections'] });
      toast.success('Connection added!');
    },
    onError: (error) => {
      toast.error('Failed to add connection');
      console.error(error);
    },
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('family_member_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family_connections'] });
      toast.success('Connection removed');
    },
    onError: (error) => {
      toast.error('Failed to remove connection');
      console.error(error);
    },
  });

  return {
    members: membersQuery.data || [],
    events: eventsQuery.data || [],
    documents: documentsQuery.data || [],
    connections: connectionsQuery.data || [],
    isLoading: membersQuery.isLoading || eventsQuery.isLoading || documentsQuery.isLoading || connectionsQuery.isLoading,
    createMember,
    updateMember,
    deleteMember,
    createEvent,
    updateEvent,
    deleteEvent,
    uploadDocument,
    deleteDocument,
    createConnection,
    deleteConnection,
  };
}
