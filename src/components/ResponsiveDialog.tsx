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
    'content-large': "p-0", // Remove all padding for content-large
    'content-full': responsiveDialogClasses.padding,
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
          // Force override base dialog sizing and spacing for content-large
          size === 'content-large' && "!max-w-[90vw] !w-[90vw] !gap-0",
          className
        )}
        style={size === 'content-large' ? { 
          maxWidth: '90vw', 
          width: '90vw' 
        } : undefined}
      >
        {(title || description) && (
          <div className={size === 'content-large' ? "px-4 md:px-6 py-4" : ""}>
            {title && (
              <DialogTitle className="text-lg md:text-xl font-bold mb-0 pb-0">
                {title}
              </DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-sm md:text-base mb-0 pb-0">
                {description}
              </DialogDescription>
            )}
          </div>
        )}
        
        <div className="flex flex-col min-h-0 flex-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}