import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Clock } from 'lucide-react';
import { useMembership } from '@/contexts/MembershipContext';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ open, onOpenChange, feature }) => {
  const { createCheckout, inTrial, trialDaysRemaining } = useMembership();

  const handleUpgrade = () => {
    createCheckout();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Crown className="h-8 w-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            Unlock {feature}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-4">
            {inTrial ? (
              <div className="bg-secondary/50 p-3 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm font-medium mb-2">
                  <Clock className="h-4 w-4" />
                  Free Trial Active
                </div>
                <p className="text-xs text-muted-foreground">
                  {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining. 
                  Subscribe now to keep access after your trial ends.
                </p>
              </div>
            ) : (
              <p className="text-base">
                This feature requires an active membership.
              </p>
            )}

            <div className="space-y-2 text-left bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold text-sm mb-2">With Annual Membership:</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Full Project Catalog Access</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Step-by-Step Workflows</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Materials & Tools Lists</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Project Scheduling</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary">$59/year</div>
              <p className="text-xs text-muted-foreground mt-1">Just $4.92/month</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleUpgrade} size="lg" className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Subscribe Now - $59/year
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Maybe Later
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
