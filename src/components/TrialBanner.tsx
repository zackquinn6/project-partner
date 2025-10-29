import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Crown } from 'lucide-react';
import { useMembership } from '@/contexts/MembershipContext';

export const TrialBanner: React.FC = () => {
  const { inTrial, isSubscribed, isAdmin, trialDaysRemaining, createCheckout } = useMembership();

  if (isAdmin || isSubscribed || !inTrial) {
    return null;
  }

  const isLastDay = trialDaysRemaining <= 1;
  const isLast3Days = trialDaysRemaining <= 3;

  return (
    <Alert className={`border-l-4 ${isLastDay ? 'border-l-destructive bg-destructive/10' : isLast3Days ? 'border-l-warning bg-warning/10' : 'border-l-primary bg-primary/10'}`}>
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <strong>Free Trial: </strong>
          {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.
          {isLastDay && ' Your trial ends tomorrow! '}
          Subscribe now to keep access to Project Catalog and Workflows.
        </div>
        <Button
          size="sm"
          onClick={createCheckout}
          className="whitespace-nowrap flex items-center gap-2"
        >
          <Crown className="h-4 w-4" />
          Subscribe $25/year
        </Button>
      </AlertDescription>
    </Alert>
  );
};
