import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface MobileAdaptiveLayoutProps {
  children: React.ReactNode;
  mobileLayout?: React.ReactNode;
  desktopLayout?: React.ReactNode;
  className?: string;
  
  // Layout configuration
  mobileFullScreen?: boolean;
  responsivePadding?: boolean;
  adaptiveSpacing?: boolean;
}

/**
 * Layout component that adapts based on screen size with consistent patterns
 */
export function MobileAdaptiveLayout({
  children,
  mobileLayout,
  desktopLayout,
  className,
  mobileFullScreen = false,
  responsivePadding = true,
  adaptiveSpacing = true,
}: MobileAdaptiveLayoutProps) {
  const { isMobile, isTablet } = useResponsive();

  // If specific layouts are provided, use them
  if (mobileLayout && isMobile) {
    return <>{mobileLayout}</>;
  }
  
  if (desktopLayout && !isMobile) {
    return <>{desktopLayout}</>;
  }

  // Otherwise, use adaptive container with responsive classes
  const containerClasses = cn(
    // Base layout
    "flex flex-col",
    
    // Mobile fullscreen option
    mobileFullScreen && isMobile && "h-screen",
    
    // Responsive padding
    responsivePadding && "responsive-padding",
    
    // Adaptive spacing
    adaptiveSpacing && "responsive-gap",
    
    // Custom classes
    className
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}

interface AdaptiveDialogProps {
  children: React.ReactNode;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}

/**
 * Dialog content wrapper with responsive sizing
 */
export function AdaptiveDialog({ children, size = 'default', className }: AdaptiveDialogProps) {
  const sizeMap = {
    sm: 'responsive-dialog-sm',
    default: 'responsive-dialog',
    lg: 'responsive-dialog-lg',
    xl: 'responsive-dialog-xl',
  };

  return (
    <div className={cn(
      sizeMap[size],
      'responsive-padding',
      'overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}
