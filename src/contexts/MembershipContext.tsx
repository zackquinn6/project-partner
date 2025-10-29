import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  trialDaysRemaining: number;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export const MembershipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [inTrial, setInTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
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

      setIsSubscribed(data.subscribed || false);
      setIsAdmin(data.isAdmin || false);
      setInTrial(data.inTrial || false);
      setTrialEndDate(data.trialEndDate || null);
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

    // Check subscription status every 5 minutes
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const canAccessPaidFeatures = isSubscribed || isAdmin || inTrial;

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
