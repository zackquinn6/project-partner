import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/contexts/MembershipContext';
import { Crown, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const MembershipStatusCard: React.FC = () => {
  const {
    isSubscribed,
    isAdmin,
    inTrial,
    trialEndDate,
    subscriptionEnd,
    loading,
    createCheckout,
    trialDaysRemaining,
  } = useMembership();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Membership Status</CardTitle>
          </div>
          {isAdmin && <Badge variant="default">Admin</Badge>}
          {!isAdmin && isSubscribed && <Badge variant="default">Member</Badge>}
          {!isAdmin && inTrial && !isSubscribed && (
            <Badge variant="secondary">Trial ({trialDaysRemaining}d)</Badge>
          )}
          {!isAdmin && !inTrial && !isSubscribed && <Badge variant="outline">Free</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin && isSubscribed && subscriptionEnd && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Renews:</span>
            <span className="font-medium">{format(new Date(subscriptionEnd), 'PP')}</span>
          </div>
        )}

        {!isAdmin && inTrial && trialEndDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trial ends:
            </span>
            <span className="font-medium">{format(new Date(trialEndDate), 'PP')}</span>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Home Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Task Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>My Tools</span>
          </div>
          <div className="flex items-center gap-2">
            {isSubscribed || isAdmin || inTrial ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted" />
            )}
            <span className={!isSubscribed && !isAdmin && !inTrial ? 'text-muted-foreground' : ''}>
              Project Catalog
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSubscribed || isAdmin || inTrial ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted" />
            )}
            <span className={!isSubscribed && !isAdmin && !inTrial ? 'text-muted-foreground' : ''}>
              Project Workflows
            </span>
          </div>
        </div>

        {!isAdmin && !isSubscribed && (
          <Button onClick={createCheckout} className="w-full" size="sm">
            <Crown className="h-4 w-4 mr-2" />
            {inTrial ? 'Subscribe Now - $59/year' : 'Upgrade to Member'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
