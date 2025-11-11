import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phase } from '@/interfaces/Project';

/**
 * Hook to fetch dynamically-built phases for a project template
 * This ensures standard phases always reflect the latest from Standard Project Foundation
 */
export function useDynamicPhases(projectId: string | undefined) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
      setPhases([]);
      setLoading(false);
      return;
    }

    const fetchDynamicPhases = async () => {
      setLoading(true);
      setError(null);

      try {
        // Call the RPC function - cast to any since types haven't been regenerated yet
        const { data, error: rpcError } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
          p_project_id: projectId
        });

        if (rpcError) {
          throw rpcError;
        }

        // Parse the result as Phase array
        const parsedPhases = (data || []) as Phase[];
        setPhases(parsedPhases);
      } catch (err) {
        console.error('Failed to fetch dynamic phases:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch phases'));
        setPhases([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDynamicPhases();
  }, [projectId]);

  return { phases, loading, error };
}
