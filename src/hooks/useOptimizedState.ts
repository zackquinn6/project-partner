import { useState, useCallback, useRef } from 'react';

interface UseOptimizedStateOptions {
  debounceMs?: number;
  enableBatching?: boolean;
}

/**
 * Optimized state hook that provides debouncing and batching for frequent updates
 */
export function useOptimizedState<T>(
  initialState: T,
  options: UseOptimizedStateOptions = {}
) {
  const { debounceMs = 0, enableBatching = false } = options;
  const [state, setState] = useState<T>(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const batchRef = useRef<T | null>(null);

  const setOptimizedState = useCallback((newState: T | ((prev: T) => T)) => {
    if (debounceMs > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setState(newState);
      }, debounceMs);
      return;
    }

    if (enableBatching) {
      batchRef.current = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(batchRef.current || state)
        : newState;
        
      // Use React's automatic batching
      Promise.resolve().then(() => {
        if (batchRef.current !== null) {
          setState(batchRef.current);
          batchRef.current = null;
        }
      });
      return;
    }

    setState(newState);
  }, [debounceMs, enableBatching, state]);

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [state, setOptimizedState, clearTimeouts] as const;
}