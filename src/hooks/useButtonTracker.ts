import { useCallback } from 'react';

/**
 * Custom hook to track button clicks and ensure reliable event handling
 * Helps debug issues with buttons requiring multiple clicks
 */
export function useButtonTracker() {
  const trackClick = useCallback((buttonName: string, action: () => void, options?: {
    preventBubbling?: boolean;
    debounceMs?: number;
  }) => {
    const { preventBubbling = true, debounceMs = 0 } = options || {};
    
    return (e: React.MouseEvent) => {
      
      if (preventBubbling) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Add debouncing if specified
      if (debounceMs > 0) {
        setTimeout(() => {
          action();
        }, debounceMs);
      } else {
        action();
      }
    };
  }, []);

  const trackTouch = useCallback((buttonName: string, action: () => void) => {
    return (e: React.TouchEvent) => {
      
      // Only handle single touch
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        action();
      }
    };
  }, []);

  return { trackClick, trackTouch };
}