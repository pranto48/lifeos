import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { useIsAdmin } from '@/hooks/useUserRoles';

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  user_id: string;
  is_admin_category?: boolean;
  category_type: 'office' | 'personal';
  created_at: string;
  updated_at: string;
}

export function useTaskCategories() {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole: isAdmin } = useIsAdmin();

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user, mode]);

  const loadCategories = async () => {
    if (!user) return;
    
    setLoading(true);
    // Load categories filtered by current mode
    const { data, error } = await supabase
      .from('task_categories')
      .select('*')
      .eq('category_type', mode)
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data as TaskCategory[]);
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
        is_admin_category: isAdmin,
        category_type: mode,
      })
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [...prev, data as TaskCategory].sort((a, b) => a.name.localeCompare(b.name)));
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

  // Check if user can edit a category (admin can edit all, users can only edit their own non-admin categories)
  const canEditCategory = (category: TaskCategory) => {
    if (isAdmin) return true;
    return category.user_id === user?.id && !category.is_admin_category;
  };

  return {
    categories,
    loading,
    isAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    canEditCategory,
    reload: loadCategories,
  };
}
