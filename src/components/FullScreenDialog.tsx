import * as React from "react"
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useResponsive } from "@/hooks/useResponsive"

interface FullScreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FullScreenDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children, 
  className 
}: FullScreenDialogProps) {
  const { isMobile } = useResponsive();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 backdrop-blur-sm fixed inset-0 z-50" />
        <div
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh]",
            "bg-background border rounded-lg shadow-lg",
            "flex flex-col overflow-hidden",
            className
          )}
        >
          {(title || description) && (
            <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
              <div>
                {title && (
                  <DialogTitle className="text-lg md:text-xl font-bold">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <DialogDescription className="text-sm md:text-base mt-1">
                    {description}
                  </DialogDescription>
                )}
              </div>
              
              {/* Close button - X for desktop, Close button for mobile */}
              {isMobile ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
          
          <div 
            className="flex-1 overflow-y-scroll p-4 md:p-6" 
            style={{ 
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {children}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}