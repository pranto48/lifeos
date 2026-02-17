import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isSelfHosted } from '@/lib/selfHostedConfig';

type AppRole = 'admin' | 'user' | 'inventory_manager' | 'support_manager';

/**
 * Hook to check if the current user has specific roles.
 * Works in both Cloud (Supabase) and self-hosted (local backend) modes.
 * 
 * In self-hosted mode, roles come from AuthContext.user.roles (set at login).
 * In cloud mode, roles are queried from the user_roles table.
 */
export function useUserRoles(requiredRoles: AppRole[] = ['admin']) {
  const { user } = useAuth();
  const [hasRole, setHasRole] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRoles = useCallback(async () => {
    if (!user) {
      setHasRole(false);
      setLoading(false);
      return;
    }

    // In self-hosted mode, roles are already available on the user object
    if (isSelfHosted()) {
      const userRoles = (user as any).roles as string[] | undefined;
      const match = userRoles?.some(r => requiredRoles.includes(r as AppRole)) ?? false;
      setHasRole(match);
      setLoading(false);
      return;
    }

    // Cloud mode: query the user_roles table
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', requiredRoles);
      setHasRole(data != null && data.length > 0);
    } catch (error) {
      console.error('Failed to check user roles:', error);
      setHasRole(false);
    } finally {
      setLoading(false);
    }
  }, [user, requiredRoles.join(',')]);

  useEffect(() => {
    setLoading(true);
    checkRoles();
  }, [checkRoles]);

  return { hasRole, loading, recheckRoles: checkRoles };
}

/**
 * Convenience hook to check if user is admin.
 */
export function useIsAdmin() {
  return useUserRoles(['admin']);
}
