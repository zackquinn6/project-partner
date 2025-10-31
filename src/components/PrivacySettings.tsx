import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserDataManagement } from './UserDataManagement';

interface PrivacySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">Privacy & Data Management</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs flex-shrink-0"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <UserDataManagement />
        </div>
      </DialogContent>
    </Dialog>
  );
};