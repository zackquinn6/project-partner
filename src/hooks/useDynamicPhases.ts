import { useState, useEffect, useCallback } from 'react';
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchDynamicPhases = useCallback(async () => {
    if (!projectId) {
      setPhases([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the RPC function - cast to any since types haven't been regenerated yet
      const { data, error: rpcError } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
        p_project_id: projectId
      });

      console.log('🔍 useDynamicPhases RPC call:', {
        projectId,
        data,
        dataType: typeof data,
        dataIsArray: Array.isArray(data),
        dataLength: Array.isArray(data) ? data.length : 'N/A',
        rpcError
      });

      if (rpcError) {
        console.error('🚨 RPC Error:', rpcError);
        throw rpcError;
      }

      // Parse the result as Phase array
      // RPC returns JSONB which Supabase should auto-parse, but check if it needs manual parsing
      let parsedPhases: Phase[] = [];
      if (data) {
        if (typeof data === 'string') {
          parsedPhases = JSON.parse(data);
        } else if (Array.isArray(data)) {
          parsedPhases = data;
        } else {
          console.warn('⚠️ Unexpected data format from RPC:', data);
        }
      }
      
      console.log('✅ Parsed phases:', {
        count: parsedPhases.length,
        firstPhase: parsedPhases[0]?.name,
        phases: parsedPhases
      });
      
      setPhases(parsedPhases);
    } catch (err) {
      console.error('Failed to fetch dynamic phases:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch phases'));
      setPhases([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDynamicPhases();
  }, [fetchDynamicPhases, refreshTrigger]);

  // Expose a refetch function
  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { phases, loading, error, refetch };
}
