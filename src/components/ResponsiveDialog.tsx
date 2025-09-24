import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { responsiveDialogClasses } from "@/utils/responsive"

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: 'default' | 'large' | 'xlarge';
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        sizeClasses[size],
        responsiveDialogClasses.padding,
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
        
        <div className="flex flex-col min-h-0 flex-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}