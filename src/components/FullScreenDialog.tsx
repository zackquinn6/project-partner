import * as React from "react"
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh]",
            "bg-background border rounded-lg shadow-lg",
            "flex flex-col",
            className
          )}
        >
          {(title || description) && (
            <div className="px-4 md:px-6 py-4 border-b">
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
          )}
          
          <div className="flex-1 min-h-0 overflow-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}