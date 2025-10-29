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
            <span className="text-orange-500 text-xl font-bold leading-none">⚠️</span>
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
              className="w-full justify-start h-10 px-3 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 border border-blue-200 hover:border-blue-300 text-blue-800 hover:text-blue-900"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span className="font-medium">Chat</span>
            </Button>
            
            <Button
              onClick={() => handleOptionClick(onKeysToSuccessClick)}
              variant="ghost"
              size="sm"
              className="w-full justify-start h-10 px-3 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 border border-green-200 hover:border-green-300 text-green-800 hover:text-green-900"
            >
              <Key className="mr-2 h-4 w-4" />
              <span className="font-medium">KeyInfo</span>
            </Button>
            
            {isKickoffComplete && (
              <Button
                onClick={() => handleOptionClick(onUnplannedWorkClick)}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-10 px-3 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 border border-orange-200 hover:border-orange-300 text-orange-800 hover:text-orange-900"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span className="font-medium">Re-Plan</span>
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}