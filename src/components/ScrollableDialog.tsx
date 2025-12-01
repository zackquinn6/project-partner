import * as React from "react"
import { useEffect } from "react"
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

interface ScrollableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ScrollableDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children, 
  className 
}: ScrollableDialogProps) {
  // Enable scrolling within modal by preventing pointer events on overlay for wheel events
  useEffect(() => {
    if (open) {
      const handleWheel = (e: WheelEvent) => {
        const target = e.target as Element;
        const dialogContent = document.querySelector('[data-dialog-content]');
        
        // If the wheel event is within dialog content, allow it
        if (dialogContent && dialogContent.contains(target)) {
          e.stopPropagation();
        }
      };

      document.addEventListener('wheel', handleWheel, { capture: true });
      
      return () => {
        document.removeEventListener('wheel', handleWheel, { capture: true });
      };
    }
  }, [open]);

  // Use modal={false} to prevent nested dialog interference
  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        // Prevent any event propagation that might affect parent dialogs
        if (!newOpen) {
          onOpenChange(false);
          return;
        }
        onOpenChange(newOpen);
      }} 
      modal={false}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-md fixed inset-0 z-[100] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div
          data-dialog-content
          onClick={(e) => e.stopPropagation()}
          className={cn(
            // Mobile: Full screen
            "fixed inset-0 z-[101]",
            // Desktop: Centered with 90% viewport, ensure it's always visible
            "md:fixed md:left-1/2 md:top-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2",
            "md:w-[90vw] md:max-w-[90vw] md:h-[90vh] md:max-h-[90vh]",
            "md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100vh-2rem)]",
            "bg-background md:border md:rounded-lg shadow-lg",
            "flex flex-col",
            className
          )}
          style={{ 
            pointerEvents: 'auto',
            // Ensure proper centering on desktop - override any parent transforms
            position: 'fixed'
          }}
        >
          {/* Header with title and close button */}
          <div className={cn(
            "px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0",
            !title && !description && "sr-only"
          )}>
            <div className="flex-1 min-w-0">
              {title ? (
                <DialogTitle className="text-lg md:text-xl font-bold truncate">
                  {title}
                </DialogTitle>
              ) : (
                <VisuallyHidden.Root>
                  <DialogTitle>Dialog</DialogTitle>
                </VisuallyHidden.Root>
              )}
              {description ? (
                <DialogDescription className="text-sm md:text-base mt-1">
                  {description}
                </DialogDescription>
              ) : (
                <VisuallyHidden.Root>
                  <DialogDescription>Dialog content</DialogDescription>
                </VisuallyHidden.Root>
              )}
            </div>
            
            {/* Close button */}
            {(title || description) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
                className="ml-4 flex-shrink-0"
              >
                Close
              </Button>
            )}
          </div>
          
          {/* Scrollable content area */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6"
            style={{ overscrollBehavior: 'contain' }}
          >
            {children}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}