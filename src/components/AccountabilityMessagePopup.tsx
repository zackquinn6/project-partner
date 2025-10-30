import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

interface AccountabilityMessagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: 'phase-complete' | 'issue-report';
  progress?: number;
  projectName?: string;
}

export function AccountabilityMessagePopup({ 
  isOpen, 
  onClose, 
  messageType, 
  progress = 0,
  projectName = "their project"
}: AccountabilityMessagePopupProps) {
  const getMessage = () => {
    if (messageType === 'phase-complete') {
      return `Your friend has now completed ${Math.round(progress)}% of their project. Send them a congrats!`;
    } else {
      return "Your friend might be having a tough time on their project - how about a check-in?";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Phase Complete!</DialogTitle>
        <DialogDescription>
          {messageType === 'phase-complete' ? 'Phase completion notification' : 'Issue reporting notification'}
        </DialogDescription>
        
        <div className="py-6 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-lg font-medium mb-2">
              {getMessage()}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}