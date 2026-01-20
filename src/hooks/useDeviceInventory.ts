import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DeviceCategory {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceInventory {
  id: string;
  user_id: string;
  support_user_id: string | null;
  category_id: string | null;
  device_name: string;
  serial_number: string | null;
  purchase_date: string | null;
  delivery_date: string | null;
  supplier_name: string | null;
  requisition_number: string | null;
  bod_number: string | null;
  warranty_date: string | null;
  price: number | null;
  bill_details: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceServiceHistory {
  id: string;
  user_id: string;
  device_id: string;
  task_id: string | null;
  service_date: string;
  service_type: string;
  description: string | null;
  cost: number | null;
  technician_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeviceInventory() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [devices, setDevices] = useState<DeviceInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminStatus();
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load ALL data - RLS policies allow all authenticated users to view
    const [categoriesRes, devicesRes] = await Promise.all([
      supabase
        .from('device_categories')
        .select('*')
        .order('name'),
      supabase
        .from('device_inventory')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    if (!categoriesRes.error && categoriesRes.data) {
      setCategories(categoriesRes.data);
    }

    if (!devicesRes.error && devicesRes.data) {
      setDevices(devicesRes.data);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Category operations
  const addCategory = async (name: string, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('device_categories')
      .insert({ user_id: user.id, name, description: description || null })
      .select()
      .single();

    if (!error && data) {
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    }
    return null;
  };

  const updateCategory = async (id: string, updates: Partial<Pick<DeviceCategory, 'name' | 'description'>>) => {
    const { error } = await supabase
      .from('device_categories')
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
      .from('device_categories')
      .delete()
      .eq('id', id);

    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    }
    return false;
  };

  // Device operations
  const addDevice = async (deviceData: Omit<DeviceInventory, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('device_inventory')
      .insert({ ...deviceData, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      setDevices(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const updateDevice = async (id: string, updates: Partial<Omit<DeviceInventory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const { error } = await supabase
      .from('device_inventory')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      return true;
    }
    return false;
  };

  const deleteDevice = async (id: string) => {
    const { error } = await supabase
      .from('device_inventory')
      .delete()
      .eq('id', id);

    if (!error) {
      setDevices(prev => prev.filter(d => d.id !== id));
      return true;
    }
    return false;
  };

  // Service history operations
  const getServiceHistory = async (deviceId: string) => {
    const { data, error } = await supabase
      .from('device_service_history')
      .select('*')
      .eq('device_id', deviceId)
      .order('service_date', { ascending: false });

    if (!error && data) {
      return data as DeviceServiceHistory[];
    }
    return [];
  };

  const addServiceRecord = async (record: Omit<DeviceServiceHistory, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('device_service_history')
      .insert({ ...record, user_id: user.id })
      .select()
      .single();

    if (!error && data) {
      return data as DeviceServiceHistory;
    }
    return null;
  };

  const updateServiceRecord = async (id: string, updates: Partial<Omit<DeviceServiceHistory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    const { error } = await supabase
      .from('device_service_history')
      .update(updates)
      .eq('id', id);

    return !error;
  };

  const deleteServiceRecord = async (id: string) => {
    const { error } = await supabase
      .from('device_service_history')
      .delete()
      .eq('id', id);

    return !error;
  };

  return {
    categories,
    devices,
    loading,
    isAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    addDevice,
    updateDevice,
    deleteDevice,
    getServiceHistory,
    addServiceRecord,
    updateServiceRecord,
    deleteServiceRecord,
    reload: loadData,
  };
}
