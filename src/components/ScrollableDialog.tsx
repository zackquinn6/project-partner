import * as React from "react"
import { useEffect } from "react"
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useResponsive } from "@/hooks/useResponsive"
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
  const { isMobile } = useResponsive();

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

  // Use modal behavior for proper background blur
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevent event bubbling to parent dialogs
      if (!newOpen) {
        // Only close this dialog, don't let it propagate to parents
        onOpenChange(false);
      } else {
        onOpenChange(newOpen);
      }
    }} modal={true}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-md fixed inset-0 z-50" />
        <div
          data-dialog-content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh]",
            "bg-background border rounded-lg shadow-lg",
            "flex flex-col",
            className
          )}
          style={{ pointerEvents: 'auto' }}
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
              <>
                {isMobile ? (
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
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChange(false);
                    }}
                    className="h-8 w-8 p-0 ml-4 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </>
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