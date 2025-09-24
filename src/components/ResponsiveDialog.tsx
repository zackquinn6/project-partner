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
    'content-large': responsiveDialogClasses.contentLarge,
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
      <DialogContent className={cn(
        "!max-w-none", // Override default max-width completely
        sizeClasses[size],
        paddingClasses[size],
        "overflow-hidden",
        className
      )}>
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