import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollableDialog } from "@/components/ScrollableDialog"
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
  // Use ScrollableDialog for content-large for proper scrolling and blur
  if (size === 'content-large') {
    return (
      <ScrollableDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        className={className}
      >
        {children}
      </ScrollableDialog>
    );
  }

  // Use standard Dialog for all other sizes
  const sizeClasses = {
    default: responsiveDialogClasses.content,
    large: responsiveDialogClasses.contentLarge,
    xlarge: responsiveDialogClasses.contentXLarge,
    'modal-sm': responsiveDialogClasses.modalSm,
    'modal-md': responsiveDialogClasses.modalMd,
    'content-full': responsiveDialogClasses.contentFull,
  };

  const paddingClasses = {
    default: responsiveDialogClasses.padding,
    large: responsiveDialogClasses.padding,
    xlarge: responsiveDialogClasses.padding,
    'modal-sm': responsiveDialogClasses.paddingSmall,
    'modal-md': responsiveDialogClasses.padding,
    'content-full': responsiveDialogClasses.padding,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-dialog-size={size}
        className={cn(
          "dialog-content-base",
          sizeClasses[size],
          // Remove default padding for content-full to avoid spacing issues
          size === 'content-full' ? 'p-0' : paddingClasses[size],
          "overflow-hidden gap-0", // Remove the default gap-4 that creates spacing
          className
        )}
      >
        {(title || description) && (
          <DialogHeader className={`${size === 'content-full' ? 'px-4 pt-4 pb-0 space-y-1' : 'pb-2 space-y-1'}`}>
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
        
        <div className={`flex flex-col min-h-0 flex-1`}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}