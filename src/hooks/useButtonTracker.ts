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
      console.log(`🎯 Button clicked: ${buttonName}`, {
        timestamp: Date.now(),
        target: e.target,
        currentTarget: e.currentTarget
      });
      
      if (preventBubbling) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Add debouncing if specified
      if (debounceMs > 0) {
        setTimeout(() => {
          console.log(`🎯 Executing action for: ${buttonName}`);
          action();
        }, debounceMs);
      } else {
        console.log(`🎯 Executing action for: ${buttonName}`);
        action();
      }
    };
  }, []);

  const trackTouch = useCallback((buttonName: string, action: () => void) => {
    return (e: React.TouchEvent) => {
      console.log(`📱 Touch event: ${buttonName}`, {
        timestamp: Date.now(),
        touches: e.touches.length,
        target: e.target
      });
      
      // Only handle single touch
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        console.log(`📱 Executing touch action for: ${buttonName}`);
        action();
      }
    };
  }, []);

  return { trackClick, trackTouch };
}