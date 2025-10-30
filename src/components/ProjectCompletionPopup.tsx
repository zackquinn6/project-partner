import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface ProjectCompletionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onReturnToWorkshop: () => void;
}

export const ProjectCompletionPopup: React.FC<ProjectCompletionPopupProps> = ({
  isOpen,
  onClose,
  projectName,
  onReturnToWorkshop
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 Project Complete!
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Congratulations! You've completed all steps for <strong>{projectName}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={onReturnToWorkshop}
            className="w-full"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to My Workshop
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Stay on Project
          </Button>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          Your progress has been saved and achievements have been updated.
        </div>
      </DialogContent>
    </Dialog>
  );
};
