import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';

interface PostKickoffNotificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDontShowAgain?: (dontShow: boolean) => void;
}

export const PostKickoffNotification: React.FC<PostKickoffNotificationProps> = ({
  open,
  onOpenChange,
  onDontShowAgain
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleGetStarted = () => {
    if (dontShowAgain && onDontShowAgain) {
      onDontShowAgain(true);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Your project is ready to begin!</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              We'll guide you through the planning details and then dive straight into execution.
            </p>
            <p>
              You can explore the project plan anytime to see what's ahead.
            </p>
            <p>
              Don't worry—we'll keep you on track with all the planning and tasks along the way.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 pt-4">
          <Button onClick={handleGetStarted} className="w-full">
            Get Started
          </Button>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label
              htmlFor="dont-show-again"
              className="text-xs text-muted-foreground font-normal cursor-pointer"
            >
              Don't show this message again
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

