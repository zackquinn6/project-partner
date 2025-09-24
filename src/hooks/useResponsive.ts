import { useState, useEffect } from 'react';
import { MOBILE_BREAKPOINT } from '@/utils/responsive';

/**
 * Enhanced responsive hook that provides more granular breakpoint detection
 */
export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    ...dimensions,
    isMobile: dimensions.width < MOBILE_BREAKPOINT,
    isTablet: dimensions.width >= MOBILE_BREAKPOINT && dimensions.width < 1024,
    isDesktop: dimensions.width >= 1024,
    isSmallScreen: dimensions.width < 640,
    isLargeScreen: dimensions.width >= 1280,
    
    // Orientation detection
    isPortrait: dimensions.height > dimensions.width,
    isLandscape: dimensions.width > dimensions.height,
    
    // Responsive helpers
    getResponsiveValue: <T>(mobile: T, desktop: T): T => {
      return dimensions.width < MOBILE_BREAKPOINT ? mobile : desktop;
    },
    
    getResponsiveClasses: (mobileClasses: string, desktopClasses: string): string => {
      return dimensions.width < MOBILE_BREAKPOINT ? mobileClasses : desktopClasses;
    }
  };
}

/**
 * Simple hook that just returns mobile/desktop state for backwards compatibility
 */
export function useIsMobile() {
  const { isMobile } = useResponsive();
  return isMobile;
}