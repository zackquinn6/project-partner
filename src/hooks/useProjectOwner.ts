import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to check if user has project owner role or is owner of a specific project.
 * 
 * ⚠️ SECURITY WARNING: This is a CLIENT-SIDE check and should ONLY be used for UI display.
 * NEVER use this for authorization or access control decisions.
 * 
 * All actual authorization MUST be performed server-side using the 
 * has_project_owner_role() and is_project_owner() security definer functions 
 * in RLS policies and backend operations.
 */
export const useProjectOwner = (projectId?: string) => {
  const { user } = useAuth();
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [hasProjectOwnerRole, setHasProjectOwnerRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProjectOwner = async () => {
      if (!user) {
        setIsProjectOwner(false);
        setHasProjectOwnerRole(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has project_owner role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'project_owner')
          .single();

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error checking project owner role:', roleError);
        }

        const hasRole = !!roleData;
        setHasProjectOwnerRole(hasRole);

        // If a specific project ID is provided, check ownership
        if (projectId) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', projectId)
            .single();

          if (projectError && projectError.code !== 'PGRST116') {
            console.error('Error checking project ownership:', projectError);
          }

          setIsProjectOwner(projectData?.owner_id === user.id);
        } else {
          setIsProjectOwner(hasRole);
        }
      } catch (error) {
        console.error('Error checking project owner status:', error);
        setIsProjectOwner(false);
        setHasProjectOwnerRole(false);
      } finally {
        setLoading(false);
      }
    };

    checkProjectOwner();
  }, [user, projectId]);

  return { isProjectOwner, hasProjectOwnerRole, loading };
};
