import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageCircle, Key, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileDIYDropdownProps {
  onHelpClick: () => void;
  onKeysToSuccessClick: () => void;
  onUnplannedWorkClick: () => void;
  isKickoffComplete: boolean;
}

export function MobileDIYDropdown({
  onHelpClick,
  onKeysToSuccessClick,
  onUnplannedWorkClick,
  isKickoffComplete
}: MobileDIYDropdownProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Only render on mobile
  if (!isMobile) return null;

  const handleOptionClick = (callback: () => void) => {
    callback();
    setOpen(false);
  };

  return (
    <div className="fixed top-4 left-4 z-50 md:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:bg-accent text-foreground flex items-center justify-center"
          >
            <span className="text-warning-soft text-xl font-bold leading-none">⚠️</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-48 p-2 bg-background border-border shadow-lg z-50"
          align="end"
          sideOffset={8}
        >
          <div className="space-y-1">
            <Button
              onClick={() => handleOptionClick(onHelpClick)}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-10 px-3 bg-gradient-to-br from-info/10 to-info/15 hover:from-info/15 hover:to-info/20 border border-info/40 hover:border-info/40 text-info hover:text-info"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span className="font-medium">Experts</span>
            </Button>
            
            <Button
              onClick={() => handleOptionClick(onKeysToSuccessClick)}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-10 px-3 bg-gradient-to-br from-success/10 to-success/15 hover:from-success/15 hover:to-success/20 border border-success/40 hover:border-success/40 text-success hover:text-success"
            >
              <Key className="mr-2 h-4 w-4" />
              <span className="font-medium">Priorities</span>
            </Button>
            
            {isKickoffComplete && (
              <Button
                onClick={() => handleOptionClick(onUnplannedWorkClick)}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-10 px-3 bg-gradient-to-br from-warning-soft/10 to-warning-soft/15 hover:from-warning-soft/15 hover:to-warning-soft/20 border border-warning-soft/40 hover:border-warning-soft/40 text-warning-soft hover:text-warning-soft"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span className="font-medium">Course Correct</span>
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}