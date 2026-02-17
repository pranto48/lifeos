import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { useUserRoles } from '@/hooks/useUserRoles';

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TicketFormField {
  id: string;
  category_id: string | null;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: { label: string; value: string }[] | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  placeholder: string | null;
  default_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketRequester {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  support_user_id: string | null;
  device_id: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  requester_id: string | null;
  category_id: string | null;
  device_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  custom_fields: Json | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  requester?: TicketRequester;
  category?: TicketCategory;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_type: string;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketActivityLog {
  id: string;
  ticket_id: string;
  user_id: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  details: Json | null;
  created_at: string;
}

export function useTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [formFields, setFormFields] = useState<TicketFormField[]>([]);
  const [requesters, setRequesters] = useState<TicketRequester[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole: isAdmin } = useUserRoles(['admin', 'support_manager']);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [ticketsRes, categoriesRes, fieldsRes, requestersRes] = await Promise.all([
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('ticket_categories').select('*').order('sort_order'),
      supabase.from('ticket_form_fields').select('*').order('sort_order'),
      supabase.from('ticket_requesters').select('*').order('name'),
    ]);

    setTickets((ticketsRes.data as SupportTicket[]) || []);
    setCategories((categoriesRes.data as TicketCategory[]) || []);
    setFormFields(
      (fieldsRes.data || []).map((f: any) => ({
        ...f,
        field_options: f.field_options ? (typeof f.field_options === 'string' ? JSON.parse(f.field_options) : f.field_options) : null,
      })) as TicketFormField[]
    );
    setRequesters((requestersRes.data as TicketRequester[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Category operations
  const addCategory = async (data: Partial<TicketCategory>) => {
    const { data: newCat, error } = await supabase
      .from('ticket_categories')
      .insert([data as any])
      .select()
      .single();
    if (error) throw error;
    setCategories((prev) => [...prev, newCat as TicketCategory]);
    return newCat;
  };

  const updateCategory = async (id: string, updates: Partial<TicketCategory>) => {
    const { data, error } = await supabase
      .from('ticket_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setCategories((prev) => prev.map((c) => (c.id === id ? (data as TicketCategory) : c)));
    return data;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('ticket_categories').delete().eq('id', id);
    if (error) throw error;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Form field operations
  const addFormField = async (data: Partial<TicketFormField>) => {
    const insertData = {
      ...data,
      field_options: data.field_options ? JSON.stringify(data.field_options) : null,
    };
    const { data: newField, error } = await supabase
      .from('ticket_form_fields')
      .insert([insertData as any])
      .select()
      .single();
    if (error) throw error;
    const parsed = {
      ...newField,
      field_options: newField.field_options
        ? typeof newField.field_options === 'string'
          ? JSON.parse(newField.field_options)
          : newField.field_options
        : null,
    };
    setFormFields((prev) => [...prev, parsed as TicketFormField]);
    return parsed;
  };

  const updateFormField = async (id: string, updates: Partial<TicketFormField>) => {
    const updateData = {
      ...updates,
      field_options: updates.field_options ? JSON.stringify(updates.field_options) : undefined,
    };
    const { data, error } = await supabase
      .from('ticket_form_fields')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const parsed = {
      ...data,
      field_options: data.field_options
        ? typeof data.field_options === 'string'
          ? JSON.parse(data.field_options)
          : data.field_options
        : null,
    };
    setFormFields((prev) => prev.map((f) => (f.id === id ? (parsed as TicketFormField) : f)));
    return parsed;
  };

  const deleteFormField = async (id: string) => {
    const { error } = await supabase.from('ticket_form_fields').delete().eq('id', id);
    if (error) throw error;
    setFormFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Ticket operations
  const updateTicket = async (id: string, updates: Partial<SupportTicket>) => {
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setTickets((prev) => prev.map((t) => (t.id === id ? (data as SupportTicket) : t)));

    // Log activity
    if (user) {
      const changes = Object.entries(updates)
        .filter(([key]) => !['updated_at'].includes(key))
        .map(([key, value]) => ({ field: key, new_value: value }));

      if (changes.length > 0) {
        await supabase.from('ticket_activity_log').insert({
          ticket_id: id,
          user_id: user.id,
          action: 'update',
          details: changes as unknown as Json,
        });
      }
    }

    return data;
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase.from('support_tickets').delete().eq('id', id);
    if (error) throw error;
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  // Comment operations
  const addComment = async (ticketId: string, content: string, isInternal: boolean = false) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_type: 'staff',
        author_id: user.id,
        content,
        is_internal: isInternal,
      })
      .select()
      .single();
    if (error) throw error;

    // Log activity
    await supabase.from('ticket_activity_log').insert({
      ticket_id: ticketId,
      user_id: user.id,
      action: isInternal ? 'internal_note' : 'comment',
      new_value: content.substring(0, 100),
    });

    return data as TicketComment;
  };

  const getTicketComments = async (ticketId: string): Promise<TicketComment[]> => {
    const { data, error } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as TicketComment[]) || [];
  };

  const getTicketActivity = async (ticketId: string): Promise<TicketActivityLog[]> => {
    const { data, error } = await supabase
      .from('ticket_activity_log')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as TicketActivityLog[]) || [];
  };

  // Get fields for a specific category
  const getFieldsForCategory = (categoryId: string | null): TicketFormField[] => {
    return formFields.filter((f) => f.is_active && (f.category_id === null || f.category_id === categoryId));
  };

  return {
    tickets,
    categories,
    formFields,
    requesters,
    loading,
    isAdmin,
    reload: loadData,
    // Categories
    addCategory,
    updateCategory,
    deleteCategory,
    // Form fields
    addFormField,
    updateFormField,
    deleteFormField,
    getFieldsForCategory,
    // Tickets
    updateTicket,
    deleteTicket,
    // Comments
    addComment,
    getTicketComments,
    getTicketActivity,
  };
}
