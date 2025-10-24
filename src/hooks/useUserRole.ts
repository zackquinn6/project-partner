import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check user role for UI purposes only.
 * 
 * ⚠️ SECURITY WARNING: This is a CLIENT-SIDE check and should ONLY be used for UI display.
 * NEVER use this for authorization or access control decisions.
 * 
 * All actual authorization MUST be performed server-side using the is_admin() 
 * security definer function in RLS policies and backend operations.
 * 
 * This hook is safe to use for:
 * - Showing/hiding UI elements (admin menus, buttons, etc.)
 * - Conditional rendering of components
 * - UI navigation logic
 * 
 * This hook should NEVER be used for:
 * - Granting access to sensitive data
 * - Allowing privileged operations
 * - Bypassing server-side validation
 */
export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
          console.error('Error checking user role:', error);
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking user role:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  return { isAdmin, loading };
};