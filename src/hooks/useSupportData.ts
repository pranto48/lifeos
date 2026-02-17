import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { useUserRoles } from '@/hooks/useUserRoles';

export interface SupportUnit {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportDepartment {
  id: string;
  unit_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportUser {
  id: string;
  department_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  device_info: string | null;
  ip_address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New credential and device fields
  extension_number: string | null;
  extension_password: string | null;
  mail_password: string | null;
  nas_username: string | null;
  nas_password: string | null;
  device_handover_date: string | null;
  new_device_assign: string | null;
  device_assign_date: string | null;
}

export interface SupportActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
}

export function useSupportData() {
  const { user } = useAuth();
  const [units, setUnits] = useState<SupportUnit[]>([]);
  const [departments, setDepartments] = useState<SupportDepartment[]>([]);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<SupportActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasRole: isAdmin } = useUserRoles(['admin', 'support_manager']);

  // Log activity to audit_logs table
  const logActivity = async (
    action: 'create' | 'update' | 'delete',
    entityType: 'support_unit' | 'support_department' | 'support_user',
    entityId: string,
    oldData?: Json | null,
    newData?: Json | null
  ) => {
    if (!user) return;
    
    try {
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData || null,
        new_data: newData || null,
      }]);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load ALL data - RLS policies now allow all authenticated users to view
    const [unitsRes, deptsRes, usersRes, logsRes] = await Promise.all([
      supabase.from('support_units').select('*').order('name'),
      supabase.from('support_departments').select('*').order('name'),
      supabase.from('support_users').select('*').order('name'),
      supabase.from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .in('entity_type', ['support_unit', 'support_department', 'support_user'])
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setUnits((unitsRes.data as SupportUnit[]) || []);
    setDepartments((deptsRes.data as SupportDepartment[]) || []);
    setSupportUsers((usersRes.data as SupportUser[]) || []);
    setActivityLogs((logsRes.data as SupportActivityLog[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unit operations
  const addUnit = async (name: string, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from('support_units').insert({
      user_id: user.id,
      name,
      description: description || null,
    }).select().single();

    if (error) throw error;
    
    await logActivity('create', 'support_unit', data.id, null, { name, description } as Json);
    
    setUnits(prev => [...prev, data as SupportUnit]);
    return data;
  };

  const updateUnit = async (id: string, updates: Partial<Pick<SupportUnit, 'name' | 'description'>>) => {
    const oldUnit = units.find(u => u.id === id);
    const { data, error } = await supabase.from('support_units').update(updates).eq('id', id).select().single();
    if (error) throw error;
    
    await logActivity('update', 'support_unit', id, 
      oldUnit ? { name: oldUnit.name, description: oldUnit.description } as Json : null, 
      updates as Json
    );
    
    setUnits(prev => prev.map(u => u.id === id ? data as SupportUnit : u));
    return data;
  };

  const deleteUnit = async (id: string) => {
    const oldUnit = units.find(u => u.id === id);
    const { error } = await supabase.from('support_units').delete().eq('id', id);
    if (error) throw error;
    
    await logActivity('delete', 'support_unit', id, 
      oldUnit ? { name: oldUnit.name, description: oldUnit.description } as Json : null, 
      null
    );
    
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  // Department operations
  const addDepartment = async (unitId: string, name: string, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from('support_departments').insert({
      user_id: user.id,
      unit_id: unitId,
      name,
      description: description || null,
    }).select().single();

    if (error) throw error;
    
    const unit = units.find(u => u.id === unitId);
    await logActivity('create', 'support_department', data.id, null, { name, description, unit_name: unit?.name } as Json);
    
    setDepartments(prev => [...prev, data as SupportDepartment]);
    return data;
  };

  const updateDepartment = async (id: string, updates: Partial<Pick<SupportDepartment, 'name' | 'description' | 'unit_id'>>) => {
    const oldDept = departments.find(d => d.id === id);
    const { data, error } = await supabase.from('support_departments').update(updates).eq('id', id).select().single();
    if (error) throw error;
    
    await logActivity('update', 'support_department', id, 
      oldDept ? { name: oldDept.name, description: oldDept.description } as Json : null, 
      updates as Json
    );
    
    setDepartments(prev => prev.map(d => d.id === id ? data as SupportDepartment : d));
    return data;
  };

  const deleteDepartment = async (id: string) => {
    const oldDept = departments.find(d => d.id === id);
    const { error } = await supabase.from('support_departments').delete().eq('id', id);
    if (error) throw error;
    
    await logActivity('delete', 'support_department', id, 
      oldDept ? { name: oldDept.name, description: oldDept.description } as Json : null, 
      null
    );
    
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  // Support User operations
  const addSupportUser = async (userData: {
    department_id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
    device_info?: string | null;
    ip_address?: string | null;
    notes?: string | null;
    is_active?: boolean;
    extension_number?: string | null;
    extension_password?: string | null;
    mail_password?: string | null;
    nas_username?: string | null;
    nas_password?: string | null;
    device_handover_date?: string | null;
    new_device_assign?: string | null;
    device_assign_date?: string | null;
  }) => {
    if (!user) return null;
    
    // Clean up empty date strings to null for proper database format
    const cleanedData = { ...userData };
    const dateFields = ['device_handover_date', 'device_assign_date'] as const;
    dateFields.forEach(field => {
      if (field in cleanedData && cleanedData[field] === '') {
        (cleanedData as any)[field] = null;
      }
    });
    
    const { data: newUser, error } = await supabase.from('support_users').insert({
      user_id: user.id,
      ...cleanedData,
    }).select().single();

    if (error) throw error;
    
    const dept = departments.find(d => d.id === userData.department_id);
    await logActivity('create', 'support_user', newUser.id, null, { 
      name: userData.name, 
      email: userData.email,
      department_name: dept?.name 
    } as Json);
    
    setSupportUsers(prev => [...prev, newUser as SupportUser]);
    return newUser;
  };

  const updateSupportUser = async (id: string, updates: Partial<Omit<SupportUser, 'id' | 'created_at' | 'updated_at'>>) => {
    const oldUser = supportUsers.find(u => u.id === id);
    
    // Clean up empty date strings to null for proper database format
    const cleanedUpdates = { ...updates };
    const dateFields = ['device_handover_date', 'device_assign_date'] as const;
    dateFields.forEach(field => {
      if (field in cleanedUpdates && cleanedUpdates[field] === '') {
        (cleanedUpdates as any)[field] = null;
      }
    });
    
    const { data, error } = await supabase.from('support_users').update(cleanedUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    await logActivity('update', 'support_user', id, 
      oldUser ? { name: oldUser.name, email: oldUser.email, is_active: oldUser.is_active } as Json : null, 
      { name: updates.name, email: updates.email, is_active: updates.is_active } as Json
    );
    
    setSupportUsers(prev => prev.map(u => u.id === id ? data as SupportUser : u));
    return data;
  };

  const deleteSupportUser = async (id: string) => {
    const oldUser = supportUsers.find(u => u.id === id);
    const { error } = await supabase.from('support_users').delete().eq('id', id);
    if (error) throw error;
    
    await logActivity('delete', 'support_user', id, 
      oldUser ? { name: oldUser.name, email: oldUser.email } as Json : null, 
      null
    );
    
    setSupportUsers(prev => prev.filter(u => u.id !== id));
  };

  // Helper to get departments by unit
  const getDepartmentsByUnit = (unitId: string) => departments.filter(d => d.unit_id === unitId);

  // Helper to get users by department
  const getUsersByDepartment = (departmentId: string) => supportUsers.filter(u => u.department_id === departmentId);

  // Helper to get full support user info with unit and department
  const getSupportUserWithDetails = (supportUserId: string) => {
    const supportUser = supportUsers.find(u => u.id === supportUserId);
    if (!supportUser) return null;

    const department = departments.find(d => d.id === supportUser.department_id);
    const unit = department ? units.find(u => u.id === department.unit_id) : null;

    return {
      ...supportUser,
      department,
      unit,
    };
  };

  return {
    units,
    departments,
    supportUsers,
    activityLogs,
    loading,
    isAdmin,
    reload: loadData,
    // Units
    addUnit,
    updateUnit,
    deleteUnit,
    // Departments
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentsByUnit,
    // Support Users
    addSupportUser,
    updateSupportUser,
    deleteSupportUser,
    getUsersByDepartment,
    getSupportUserWithDetails,
  };
}
