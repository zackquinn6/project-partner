import * as React from "react"
import { useEffect } from "react"
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PlanningToolWindowHeaderActions } from "@/components/PlanningWizardSteps/PlanningToolWindowHeaderActions"
import {
  PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME,
  PLANNING_TOOL_WINDOW_HEADER_CLASSNAME,
  PLANNING_TOOL_WINDOW_TITLE_CLASSNAME,
} from "@/components/PlanningWizardSteps/planningToolWindowChrome"
import {
  belowAppHeaderCenteredWindowClasses,
  belowAppHeaderOverlayClasses,
} from "@/utils/responsive"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

interface ScrollableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Replace default Close with Cancel + Save and Close (planning tool windows). */
  planningToolHeader?: boolean;
  planningToolOnCancel?: () => void;
  planningToolOnSave?: () => void | Promise<void>;
  planningToolSaveLabel?: string;
  planningToolSaveDisabled?: boolean;
}

export function ScrollableDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  children, 
  className,
  planningToolHeader = false,
  planningToolOnCancel,
  planningToolOnSave,
  planningToolSaveLabel,
  planningToolSaveDisabled,
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
        {/* Radix does not manage overlay visibility when modal={false}; render manually */}
        {open && (
          <div
            className={cn(
              "fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm",
              belowAppHeaderOverlayClasses
            )}
            style={{ pointerEvents: 'auto' }}
            aria-hidden="true"
            onClick={() => onOpenChange(false)}
          />
        )}
        <div
          data-dialog-content
          onClick={(e) => e.stopPropagation()}
          className={cn(
            // Mobile: Full screen. Desktop: center below the app header.
            "fixed inset-0 z-[101] md:fixed",
            belowAppHeaderCenteredWindowClasses,
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
          {/* Header with title and close / planning actions */}
          <div
            className={cn(
              !title && !description && "sr-only",
              planningToolHeader
                ? PLANNING_TOOL_WINDOW_HEADER_CLASSNAME
                : "flex shrink-0 items-center justify-between border-b border-border px-4 py-4 md:px-6 md:py-4"
            )}
          >
            <div className="min-w-0 flex-1">
              {title ? (
                <DialogTitle
                  className={cn(
                    planningToolHeader ? PLANNING_TOOL_WINDOW_TITLE_CLASSNAME : "truncate text-lg font-bold md:text-xl"
                  )}
                >
                  {title}
                </DialogTitle>
              ) : (
                <VisuallyHidden.Root>
                  <DialogTitle>Dialog</DialogTitle>
                </VisuallyHidden.Root>
              )}
              {description ? (
                <DialogDescription
                  className={cn(
                    planningToolHeader
                      ? "mt-1 text-sm font-normal leading-snug text-muted-foreground md:text-base"
                      : "mt-1 text-sm md:text-base"
                  )}
                >
                  {description}
                </DialogDescription>
              ) : (
                <VisuallyHidden.Root>
                  <DialogDescription>Dialog content</DialogDescription>
                </VisuallyHidden.Root>
              )}
            </div>
            
            {/* Close / planning tool header actions */}
            {(title || description) &&
              (planningToolHeader ? (
                <PlanningToolWindowHeaderActions
                  className="ml-4"
                  onCancel={planningToolOnCancel ?? (() => onOpenChange(false))}
                  onSaveAndClose={planningToolOnSave ?? (() => onOpenChange(false))}
                  saveLabel={planningToolSaveLabel}
                  saveDisabled={planningToolSaveDisabled}
                />
              ) : (
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
              ))}
          </div>
          
          {/* Scrollable content area */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              planningToolHeader
                ? PLANNING_TOOL_WINDOW_CONTENT_PADDING_CLASSNAME
                : "p-4 md:p-6"
            )}
            style={{ overscrollBehavior: 'contain' }}
          >
            {children}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}