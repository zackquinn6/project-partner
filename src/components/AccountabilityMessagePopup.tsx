import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

interface AccountabilityMessagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: 'phase-complete' | 'issue-report';
  progress?: number;
  projectName?: string;
}

// Multiple congratulatory message variations for user-facing phase completion
const CONGRATULATORY_MESSAGES = [
  (progress: number) => `You've now completed ${Math.round(progress)}% of the project. Congrats!`,
  (progress: number) => `Awesome work! You're ${Math.round(progress)}% done with your project. Keep it up!`,
  (progress: number) => `Way to go! You've completed ${Math.round(progress)}% of the project. You're making great progress!`,
  (progress: number) => `Fantastic! You're ${Math.round(progress)}% through the project. You've got this!`,
  (progress: number) => `Excellent progress! You've finished ${Math.round(progress)}% of the project. Keep pushing forward!`,
  (progress: number) => `You're crushing it! ${Math.round(progress)}% complete. Great job staying on track!`,
  (progress: number) => `Outstanding! You've reached ${Math.round(progress)}% completion. Your hard work is paying off!`,
  (progress: number) => `Nice work! You're ${Math.round(progress)}% done. Every step counts!`,
];

export function AccountabilityMessagePopup({ 
  isOpen, 
  onClose, 
  messageType, 
  progress = 0,
  projectName = "your project"
}: AccountabilityMessagePopupProps) {
  // Select a random message variation each time the popup opens
  const message = useMemo(() => {
    if (messageType === 'phase-complete') {
      const randomIndex = Math.floor(Math.random() * CONGRATULATORY_MESSAGES.length);
      return CONGRATULATORY_MESSAGES[randomIndex](progress);
    } else {
      return "You might be having a tough time on your project - how about taking a break or reaching out for help?";
    }
  }, [messageType, progress, isOpen]); // Re-select when popup opens

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Phase Complete!</DialogTitle>
        <DialogDescription>
          {messageType === 'phase-complete' ? 'Great progress on your project!' : 'Project support'}
        </DialogDescription>
        
        <div className="py-6 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✓</span>
            </div>
            <p className="text-lg font-medium mb-2">
              {message}
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