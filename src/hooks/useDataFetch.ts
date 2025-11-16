import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface UseDataFetchOptions<T> {
  table: string;
  select?: string;
  filters?: Array<{ column: string; value: any; operator?: string }>;
  orderBy?: { column: string; ascending?: boolean };
  transform?: (data: any[]) => T[];
  dependencies?: any[];
  cacheKey?: string;
  enabled?: boolean; // Add enabled parameter to interface
}

interface UseDataFetchResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (newData: T[]) => void;
}

const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useDataFetch<T = any>({
  table,
  select = '*',
  filters = [],
  orderBy,
  transform,
  dependencies = [],
  cacheKey,
  enabled = true // Add enabled parameter
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled); // Only load if enabled
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParams = useRef<string>('');

  // Memoize fetch parameters to avoid unnecessary re-fetches
  const fetchParams = useMemo(() => {
    return JSON.stringify({
      table,
      select,
      filters,
      orderBy,
      cacheKey,
      enabled
    });
  }, [table, select, filters, orderBy, cacheKey, enabled]);

  const fetchData = useCallback(async (useCache = true) => {
    // Skip fetch if disabled
    if (!enabled) {
      return;
    }

    // Prevent duplicate fetches with same parameters
    if (fetchParams === lastFetchParams.current && data.length > 0 && !loading) {
      return;
    }

    if (cacheKey && useCache) {
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table as any).select(select);

      // Apply filters
      filters.forEach(filter => {
        const { column, value, operator = 'eq' } = filter;
        query = (query as any)[operator](column, value);
      });
      
      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        console.error(`❌ useDataFetch error for table ${table}:`, fetchError);
        throw new Error(fetchError.message);
      }

      console.log(`📊 useDataFetch: table=${table}, rawCount=${result?.length || 0}`, {
        filters,
        orderBy,
        hasTransform: !!transform
      });

      const transformedData = transform ? transform(result || []) : (result || []) as T[];
      
      console.log(`✅ useDataFetch: table=${table}, transformedCount=${transformedData.length}`);
      
      setData(transformedData);
      lastFetchParams.current = fetchParams;
      
      if (cacheKey) {
        dataCache.set(cacheKey, { data: transformedData, timestamp: Date.now() });
      }

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        
        // Only show toast for actual errors, not when data doesn't exist
        if (!err.message.includes('No rows')) {
          let errorDescription = `Failed to load ${table}`;
          
          if (err.message === 'Failed to fetch') {
            errorDescription = 'Network connection issue. Please check your internet connection and try again.';
          } else if (err.message.includes('JWT')) {
            errorDescription = 'Authentication expired. Please sign in again.';
          } else if (err.message.includes('permission')) {
            errorDescription = 'Access denied. You may not have permission to view this data.';
          } else {
            errorDescription = `${errorDescription}: ${err.message}`;
          }
          
          toast({
            title: "Connection Error",
            description: errorDescription,
            variant: "destructive",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [table, select, JSON.stringify(filters), JSON.stringify(orderBy), cacheKey, transform, enabled]);

  const refetch = useCallback(() => fetchData(false), [fetchData]);

  const mutate = useCallback((newData: T[]) => {
    setData(newData);
    if (cacheKey) {
      dataCache.set(cacheKey, { data: newData, timestamp: Date.now() });
    }
  }, [cacheKey]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, table, select, JSON.stringify(filters), JSON.stringify(orderBy), cacheKey, ...dependencies]);

  return { data, loading, error, refetch, mutate };
}