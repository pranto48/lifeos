import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export function useSupportData() {
  const { user } = useAuth();
  const [units, setUnits] = useState<SupportUnit[]>([]);
  const [departments, setDepartments] = useState<SupportDepartment[]>([]);
  const [supportUsers, setSupportUsers] = useState<SupportUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [unitsRes, deptsRes, usersRes] = await Promise.all([
      supabase.from('support_units').select('*').eq('user_id', user.id).order('name'),
      supabase.from('support_departments').select('*').eq('user_id', user.id).order('name'),
      supabase.from('support_users').select('*').eq('user_id', user.id).order('name'),
    ]);

    setUnits((unitsRes.data as SupportUnit[]) || []);
    setDepartments((deptsRes.data as SupportDepartment[]) || []);
    setSupportUsers((usersRes.data as SupportUser[]) || []);
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
    setUnits(prev => [...prev, data as SupportUnit]);
    return data;
  };

  const updateUnit = async (id: string, updates: Partial<Pick<SupportUnit, 'name' | 'description'>>) => {
    const { data, error } = await supabase.from('support_units').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setUnits(prev => prev.map(u => u.id === id ? data as SupportUnit : u));
    return data;
  };

  const deleteUnit = async (id: string) => {
    const { error } = await supabase.from('support_units').delete().eq('id', id);
    if (error) throw error;
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
    setDepartments(prev => [...prev, data as SupportDepartment]);
    return data;
  };

  const updateDepartment = async (id: string, updates: Partial<Pick<SupportDepartment, 'name' | 'description' | 'unit_id'>>) => {
    const { data, error } = await supabase.from('support_departments').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setDepartments(prev => prev.map(d => d.id === id ? data as SupportDepartment : d));
    return data;
  };

  const deleteDepartment = async (id: string) => {
    const { error } = await supabase.from('support_departments').delete().eq('id', id);
    if (error) throw error;
    setDepartments(prev => prev.filter(d => d.id !== id));
  };

  // Support User operations
  const addSupportUser = async (data: Omit<SupportUser, 'id' | 'created_at' | 'updated_at'> & { department_id: string }) => {
    if (!user) return null;
    const { data: newUser, error } = await supabase.from('support_users').insert({
      user_id: user.id,
      ...data,
    }).select().single();

    if (error) throw error;
    setSupportUsers(prev => [...prev, newUser as SupportUser]);
    return newUser;
  };

  const updateSupportUser = async (id: string, updates: Partial<Omit<SupportUser, 'id' | 'created_at' | 'updated_at'>>) => {
    const { data, error } = await supabase.from('support_users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    setSupportUsers(prev => prev.map(u => u.id === id ? data as SupportUser : u));
    return data;
  };

  const deleteSupportUser = async (id: string) => {
    const { error } = await supabase.from('support_users').delete().eq('id', id);
    if (error) throw error;
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
    loading,
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
