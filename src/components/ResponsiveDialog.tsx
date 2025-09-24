import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { responsiveDialogClasses } from "@/utils/responsive"

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: 'default' | 'large' | 'xlarge' | 'modal-sm' | 'modal-md' | 'content-large' | 'content-full';
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  size = 'default',
  children, 
  className 
}: ResponsiveDialogProps) {
  // Simple debug to verify component is running
  console.log('🎯 ResponsiveDialog render - size:', size, 'open:', open, 'title:', title);
  
  // Debug logging
  React.useEffect(() => {
    if (open) {
      console.log('✅ ResponsiveDialog opened with size:', size);
      console.log('📏 Title:', title);
      
      // Check actual DOM element after render
      setTimeout(() => {
        const dialogContent = document.querySelector('[data-radix-dialog-content]');
        if (dialogContent) {
          const computedStyle = window.getComputedStyle(dialogContent);
          console.log('📐 Dialog actual styles:', {
            maxWidth: computedStyle.maxWidth,
            width: computedStyle.width,
            className: dialogContent.className
          });
        }
      }, 100);
    }
  }, [open, size, title]);
  const sizeClasses = {
    default: responsiveDialogClasses.content,
    large: responsiveDialogClasses.contentLarge,
    xlarge: responsiveDialogClasses.contentXLarge,
    'modal-sm': responsiveDialogClasses.modalSm,
    'modal-md': responsiveDialogClasses.modalMd,
    'content-large': "!max-w-[100vw] !max-h-[100vh] md:!max-w-[90vw] md:!max-h-[90vh] !w-full !h-full",
    'content-full': responsiveDialogClasses.contentFull,
  };

  const paddingClasses = {
    default: responsiveDialogClasses.padding,
    large: responsiveDialogClasses.padding,
    xlarge: responsiveDialogClasses.padding,
    'modal-sm': responsiveDialogClasses.paddingSmall,
    'modal-md': responsiveDialogClasses.padding,
    'content-large': responsiveDialogClasses.paddingGenerous,
    'content-full': responsiveDialogClasses.paddingGenerous,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-dialog-size={size}
        className={cn(
          "dialog-content-base",
          sizeClasses[size],
          paddingClasses[size],
          "overflow-hidden",
          // Force override base dialog sizing for content-large
          size === 'content-large' && "!max-w-[90vw] !w-[90vw]",
          className
        )}
        style={size === 'content-large' ? { 
          maxWidth: '90vw', 
          width: '90vw' 
        } : undefined}
      >
        {(title || description) && (
          <DialogHeader>
            {title && (
              <DialogTitle className="text-lg md:text-xl font-bold">
                {title}
              </DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-sm md:text-base">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        
        <div className={cn(
          "flex flex-col min-h-0 flex-1",
          size === 'content-large' || size === 'content-full' ? responsiveDialogClasses.gapGenerous : responsiveDialogClasses.gap
        )}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}