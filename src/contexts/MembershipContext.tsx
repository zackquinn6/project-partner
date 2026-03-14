import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBetaMode } from '@/hooks/useBetaMode';

/** Apps that are always openable without a subscription. All other apps require an active subscription. */
export const FREE_APP_ACTION_KEYS = ['my-tools', 'home-maintenance', 'task-manager'] as const;

interface MembershipContextType {
  isSubscribed: boolean;
  isAdmin: boolean;
  inTrial: boolean;
  trialEndDate: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  redeemCoupon: (code: string) => Promise<void>;
  canAccessPaidFeatures: boolean;
  /** True if the app can be opened (free apps always; others require subscription). */
  canAccessApp: (actionKey: string) => boolean;
  trialDaysRemaining: number;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export const MembershipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isBetaMode } = useBetaMode();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [inTrial, setInTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [lastTrialNotificationDate, setLastTrialNotificationDate] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      // Check if user needs to re-authenticate
      if (data.requiresReauth) {
        console.log('User account not found, signing out:', data.error);
        toast({
          title: "Session Expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
        // Sign out to clear invalid session
        await supabase.auth.signOut();
        return;
      }

      setIsSubscribed(data.subscribed || false);
      setIsAdmin(data.isAdmin || false);
      setInTrial(data.inTrial || false);
      setTrialEndDate(data.trialEndDate || null);
      setLastTrialNotificationDate(data.lastTrialNotificationDate ?? null);
      setSubscriptionEnd(data.subscriptionEnd || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const redeemCoupon = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('redeem-coupon', {
        body: { code },
      });
      
      if (error) throw error;

      toast({
        title: "Coupon Redeemed!",
        description: `Your trial has been extended by ${data.daysExtended} days.`,
      });

      await checkSubscription();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to redeem coupon.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkSubscription();

    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Daily in-app trial reminder (positive); show once per day when in trial
  useEffect(() => {
    if (!user || !inTrial || !trialEndDate || loading) return;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyNotifiedToday = lastTrialNotificationDate === today;
    if (alreadyNotifiedToday) return;

    const showReminder = () => {
      const daysLeft = Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      toast({
        title: "You're in your free trial",
        description: `We hope you're finding Toolio helpful. You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to explore – we're here to help you get your project done.`,
      });
      setLastTrialNotificationDate(today);
      supabase.rpc('record_trial_notification_shown').then(() => {}).catch(() => {});
    };

    const t = setTimeout(showReminder, 1500);
    return () => clearTimeout(t);
  }, [user, inTrial, trialEndDate, loading, lastTrialNotificationDate, toast]);

  const canAccessPaidFeatures = isBetaMode || isSubscribed || isAdmin || inTrial;

  const canAccessApp = useCallback((actionKey: string): boolean => {
    if ((FREE_APP_ACTION_KEYS as readonly string[]).includes(actionKey)) return true;
    return canAccessPaidFeatures;
  }, [canAccessPaidFeatures]);

  const trialDaysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <MembershipContext.Provider
      value={{
        isSubscribed,
        isAdmin,
        inTrial,
        trialEndDate,
        subscriptionEnd,
        loading,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
        redeemCoupon,
        canAccessPaidFeatures,
        canAccessApp,
        trialDaysRemaining,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
};
