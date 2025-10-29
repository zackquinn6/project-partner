import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMembership } from '@/contexts/MembershipContext';
import { CreditCard, Clock, Gift, Crown } from 'lucide-react';
import { format } from 'date-fns';

export const MembershipManagement: React.FC = () => {
  const {
    isSubscribed,
    isAdmin,
    inTrial,
    trialEndDate,
    subscriptionEnd,
    loading,
    createCheckout,
    openCustomerPortal,
    redeemCoupon,
    trialDaysRemaining,
  } = useMembership();

  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setRedeeming(true);
    await redeemCoupon(couponCode);
    setCouponCode('');
    setRedeeming(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Membership Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Membership Status
          </CardTitle>
          <CardDescription>
            {isAdmin && "You have admin access to all features"}
            {!isAdmin && isSubscribed && "You have full access to all premium features"}
            {!isAdmin && inTrial && !isSubscribed && "You're in your free trial period"}
            {!isAdmin && !inTrial && !isSubscribed && "You're using the free tier"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Plan:</span>
            {isAdmin && <Badge variant="default">Admin</Badge>}
            {!isAdmin && isSubscribed && <Badge variant="default">Annual Member - $25/year</Badge>}
            {!isAdmin && inTrial && !isSubscribed && (
              <Badge variant="secondary">Free Trial ({trialDaysRemaining} days left)</Badge>
            )}
            {!isAdmin && !inTrial && !isSubscribed && <Badge variant="outline">Free Tier</Badge>}
          </div>

          {!isAdmin && isSubscribed && subscriptionEnd && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Renews on:</span>
              <span className="font-medium">{format(new Date(subscriptionEnd), 'PPP')}</span>
            </div>
          )}

          {!isAdmin && inTrial && trialEndDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Trial ends:
              </span>
              <span className="font-medium">{format(new Date(trialEndDate), 'PPP')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade / Manage Subscription */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSubscribed && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock the Project Catalog and Project Workflows for just $25/year.
                </p>
                <Button onClick={createCheckout} className="w-full">
                  Subscribe Now - $25/year
                </Button>
              </div>
            )}

            {isSubscribed && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Manage your subscription, update payment method, or cancel anytime.
                </p>
                <Button onClick={openCustomerPortal} variant="outline" className="w-full">
                  Manage Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coupon Code */}
      {!isAdmin && inTrial && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Extend Your Trial
            </CardTitle>
            <CardDescription>
              Have a coupon code? Redeem it here to extend your trial period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                disabled={redeeming}
              />
              <Button onClick={handleRedeemCoupon} disabled={!couponCode.trim() || redeeming}>
                {redeeming ? 'Redeeming...' : 'Redeem'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Home Maintenance</span>
              <Badge variant="default">Included</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Task Manager</span>
              <Badge variant="default">Included</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>My Tools</span>
              <Badge variant="default">Included</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Profile Management</span>
              <Badge variant="default">Included</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Project Catalog</span>
              {isSubscribed || isAdmin || inTrial ? (
                <Badge variant="default">Unlocked</Badge>
              ) : (
                <Badge variant="secondary">Locked</Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Project Workflows</span>
              {isSubscribed || isAdmin || inTrial ? (
                <Badge variant="default">Unlocked</Badge>
              ) : (
                <Badge variant="secondary">Locked</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
