import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useTaskCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
  };

  const addCategory = async (name: string, color: string, icon?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('task_categories')
      .insert({
        user_id: user.id,
        name,
        color,
        icon: icon || 'Folder',
      })
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    }
    return null;
  };

  const updateCategory = async (id: string, updates: Partial<Pick<TaskCategory, 'name' | 'color' | 'icon'>>) => {
    const { error } = await supabase
      .from('task_categories')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      return true;
    }
    return false;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('task_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    }
    return false;
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    reload: loadCategories,
  };
}
