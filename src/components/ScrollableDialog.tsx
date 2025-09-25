import * as React from "react"
import { useEffect } from "react"
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useResponsive } from "@/hooks/useResponsive"

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

  // Custom scroll handling for modal dialogs
  useEffect(() => {
    if (open) {
      // Prevent background scroll while keeping dialog scrollable
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Use non-modal behavior for scrolling with custom blur overlay
  return (
    <>
      {/* Custom blur overlay when dialog is open */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
          onClick={() => onOpenChange(false)}
        />
      )}
      
      <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
        <DialogPortal>
          <div
            className={cn(
              "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
              "w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh]",
              "bg-background border rounded-lg shadow-lg",
              "flex flex-col",
              className
            )}
          >
            {/* Header with title and close button */}
            {(title || description) && (
              <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                <div className="flex-1 min-w-0">
                  {title && (
                    <DialogTitle className="text-lg md:text-xl font-bold truncate">
                      {title}
                    </DialogTitle>
                  )}
                  {description && (
                    <DialogDescription className="text-sm md:text-base mt-1">
                      {description}
                    </DialogDescription>
                  )}
                </div>
                
                {/* Close button */}
                {isMobile ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="ml-4 flex-shrink-0"
                  >
                    Close
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="h-8 w-8 p-0 ml-4 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            
            {/* Scrollable content area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 overscroll-contain">
              {children}
            </div>
          </div>
        </DialogPortal>
      </Dialog>
    </>
  );
}
