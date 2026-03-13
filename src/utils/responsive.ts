/**
 * Responsive utility functions and constants for consistent mobile-desktop design
 */

// Standard breakpoint (aligned with Tailwind md: and useIsMobile hook)
export const MOBILE_BREAKPOINT = 768;

// Responsive class generators
export const responsiveDialogClasses = {
  // Small modal - confirmations, simple forms
  modalSm: "max-w-[95vw] max-h-[95vh] md:max-w-md md:max-h-[80vh]",
  
  // Medium modal - detailed forms, settings
  modalMd: "max-w-[95vw] max-h-[95vh] md:max-w-2xl md:max-h-[85vh]",
  
  // Standard Window - matches Project & Task Manager design (90% screen on desktop, full on mobile)
  standardWindow: "w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:max-h-[90vh]",
  
  // Large content - main feature windows (90% screen utilization)
  contentLarge: "w-full h-full max-w-[100vw] max-h-[100vh] md:max-w-[90vw] md:max-h-[90vh]",
  
  // Full experience - immersive full-screen
  contentFull: "w-full h-full max-w-[100vw] max-h-[100vh]",
  
  // Legacy sizes for compatibility
  content: "max-w-[95vw] max-h-[95vh] md:max-w-lg md:max-h-[85vh]",
  contentXLarge: "max-w-[95vw] max-h-[95vh] md:max-w-4xl md:max-h-[85vh]",
  
  // Padding that scales appropriately
  padding: "p-4 md:p-6",
  paddingSmall: "p-3 md:p-4",
  paddingGenerous: "p-6 md:p-8",
  
  // Touch-friendly vs desktop-optimized spacing
  gap: "gap-3 md:gap-4",
  gapLarge: "gap-4 md:gap-6",
  gapGenerous: "gap-6 md:gap-8",
};

export const responsiveSpacing = {
  // Container padding
  container: "px-4 md:px-6 lg:px-8",
  
  // Section spacing  
  section: "py-6 md:py-8 lg:py-12",
  
  // Component spacing
  component: "space-y-4 md:space-y-6",
  
  // Button sizing
  button: "h-9 md:h-10",
  buttonSmall: "h-8 md:h-9",
  buttonLarge: "h-10 md:h-11",
};

export const responsiveTouchTargets = {
  // Minimum touch target sizes (44px on mobile, can be smaller on desktop)
  minimum: "min-h-[44px] md:min-h-[36px]",
  button: "h-11 md:h-9", // Larger on mobile for touch
  icon: "h-11 w-11 md:h-9 md:w-9",
};

export const responsiveText = {
  // Text sizing that scales appropriately
  heading1: "text-2xl md:text-3xl lg:text-4xl",
  heading2: "text-xl md:text-2xl lg:text-3xl", 
  heading3: "text-lg md:text-xl lg:text-2xl",
  body: "text-sm md:text-base",
  small: "text-xs md:text-sm",
};

// Utility function to check if we're on mobile (for use in components)
export const isMobileViewport = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
};