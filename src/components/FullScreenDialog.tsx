import * as React from "react"
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useResponsive } from "@/hooks/useResponsive"
import {
  belowAppHeaderCenteredWindowClasses,
  belowAppHeaderOverlayClasses,
} from "@/utils/responsive"

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
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogPortal>
        <DialogOverlay className={cn("bg-black/60 backdrop-blur-md fixed inset-0 z-50", belowAppHeaderOverlayClasses)} />
        <div
          className={cn(
            "fixed z-50 bg-background border shadow-lg flex flex-col",
            isMobile
              ? "inset-0 h-[100dvh] w-full max-w-full max-h-[100dvh] translate-x-0 translate-y-0 left-0 top-0 rounded-none"
              : cn(belowAppHeaderCenteredWindowClasses, "rounded-lg"),
            className
          )}
        >
          <div className="px-4 md:px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
            <div>
              {title ? (
                <DialogTitle className="text-lg md:text-xl font-bold">
                  {title}
                </DialogTitle>
              ) : (
                <DialogTitle className="sr-only">Dialog</DialogTitle>
              )}
              {description ? (
                <DialogDescription className="text-sm md:text-base mt-1">
                  {description}
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">Dialog content</DialogDescription>
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
          
          <div 
            className="flex-1 min-h-0 overflow-y-auto enhanced-scroll p-4 md:p-6"
          >
            {children}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}