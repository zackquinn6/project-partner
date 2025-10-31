import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { ScrollableDialog } from "@/components/ScrollableDialog"
import { cn } from "@/lib/utils"
import { responsiveDialogClasses } from "@/utils/responsive"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import * as DialogPrimitive from "@radix-ui/react-dialog"

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: 'default' | 'large' | 'xlarge' | 'modal-sm' | 'modal-md' | 'content-large' | 'content-full' | 'standard-window';
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
        onOpenChange={(newOpen) => {
          // Prevent this dialog from affecting parent dialogs
          if (!newOpen) {
            onOpenChange(false);
          }
        }}
        title={title}
        description={description}
        className={className}
      >
        {children}
      </ScrollableDialog>
    );
  }

  // Use standard Dialog for all other sizes, with manual z-index control for standard-window
  const sizeClasses = {
    default: responsiveDialogClasses.content,
    large: responsiveDialogClasses.contentLarge,
    xlarge: responsiveDialogClasses.contentXLarge,
    'modal-sm': responsiveDialogClasses.modalSm,
    'modal-md': responsiveDialogClasses.modalMd,
    'content-large': responsiveDialogClasses.contentLarge,
    'content-full': responsiveDialogClasses.contentFull,
    'standard-window': responsiveDialogClasses.standardWindow,
  };

  const paddingClasses = {
    default: responsiveDialogClasses.padding,
    large: responsiveDialogClasses.padding,
    xlarge: responsiveDialogClasses.padding,
    'modal-sm': responsiveDialogClasses.paddingSmall,
    'modal-md': responsiveDialogClasses.padding,
    'content-large': responsiveDialogClasses.padding,
    'content-full': responsiveDialogClasses.padding,
    'standard-window': 'p-0',
  };

  // For standard-window, manually control z-index to keep parent windows at z-50
  if (size === 'standard-window') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="z-50" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
              "bg-background border shadow-lg rounded-lg",
              "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
              "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
              sizeClasses[size],
              paddingClasses[size],
              "overflow-hidden flex flex-col",
              className
            )}
          >
            <DialogHeader className={`${title || description ? 'px-4 pt-4 pb-2' : 'sr-only'} flex flex-col space-y-1 text-center sm:text-left`}>
              {title ? (
                <DialogTitle className="text-lg md:text-xl font-bold">
                  {title}
                </DialogTitle>
              ) : (
                <VisuallyHidden.Root>
                  <DialogTitle>Dialog</DialogTitle>
                </VisuallyHidden.Root>
              )}
              {description ? (
                <DialogDescription className="text-sm md:text-base">
                  {description}
                </DialogDescription>
              ) : (
                <VisuallyHidden.Root>
                  <DialogDescription>Dialog content</DialogDescription>
                </VisuallyHidden.Root>
              )}
            </DialogHeader>
            
            <div className={`flex flex-col min-h-0 flex-1`}>
              {children}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-dialog-size={size}
        className={cn(
          "dialog-content-base",
          sizeClasses[size],
          // Remove default padding for content-full to avoid spacing issues
          size === 'content-full' ? 'p-0' : paddingClasses[size],
          "overflow-hidden flex flex-col", // Use flex instead of grid to control spacing precisely
          className
        )}
      >
        <DialogHeader className={`${size === 'content-full' ? 'px-4 pt-4 pb-0' : title || description ? 'pb-2' : 'sr-only'} flex flex-col space-y-1 text-center sm:text-left`}>
          {title ? (
            <DialogTitle className="text-lg md:text-xl font-bold">
              {title}
            </DialogTitle>
          ) : (
            <VisuallyHidden.Root>
              <DialogTitle>Dialog</DialogTitle>
            </VisuallyHidden.Root>
          )}
          {description ? (
            <DialogDescription className="text-sm md:text-base">
              {description}
            </DialogDescription>
          ) : (
            <VisuallyHidden.Root>
              <DialogDescription>Dialog content</DialogDescription>
            </VisuallyHidden.Root>
          )}
        </DialogHeader>
        
        <div className={`flex flex-col min-h-0 flex-1`}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}