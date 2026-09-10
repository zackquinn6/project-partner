import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBetaMode } from '@/hooks/useBetaMode';

export type SubscriptionTier = 'none' | 'risk_less' | 'projects';

/** Native app keys that require the $59/yr Projects tier (catalog + guided project runs). */
export const PROJECTS_TIER_APP_ACTION_KEYS = ['project-catalog'] as const;

/** Native app keys that require Risk-less ($15/yr) or Projects tier. */
export const RISK_LESS_APP_ACTION_KEYS = ['risk-management', 'risk-focus'] as const;

interface MembershipContextType {
  isSubscribed: boolean;
  isAdmin: boolean;
  isProjectOwner: boolean;
  inTrial: boolean;
  trialEndDate: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  /** Public beta unlock from app_settings.beta_mode. */
  isBetaMode: boolean;
  /** Stripe/API tier: none, risk_less ($15/yr), or projects ($59/yr). Trial users are treated as projects on the client. */
  subscriptionTier: SubscriptionTier;
  /** Catalog, start/open catalog-backed project runs, full workflows. */
  hasProjectsTier: boolean;
  /** Risk-less apps; includes everyone who has Projects tier. */
  hasRiskLessTier: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  redeemCoupon: (code: string) => Promise<void>;
  /** Any paid or trial access (legacy); prefer hasProjectsTier / hasRiskLessTier for gating. */
  canAccessPaidFeatures: boolean;
  /** Per-app gate: catalog = projects tier; risk apps = risk_less+; all other registered apps = free. */
  canAccessApp: (actionKey: string) => boolean;
  trialDaysRemaining: number;
}

// Keep one context identity across Vite hot updates. Without this, an updated
// consumer can briefly read a different context instance than the mounted
// provider and crash the whole page even though App nests the provider correctly.
const membershipContextStore = globalThis as typeof globalThis & {
  __projectPartnerMembershipContext?: React.Context<MembershipContextType | undefined>;
};

const MembershipContext =
  membershipContextStore.__projectPartnerMembershipContext ??
  createContext<MembershipContextType | undefined>(undefined);

membershipContextStore.__projectPartnerMembershipContext = MembershipContext;

function normalizeTier(data: {
  subscribed?: boolean;
  subscriptionTier?: string;
}): SubscriptionTier {
  const t = data.subscriptionTier;
  if (t === 'risk_less' || t === 'projects' || t === 'none') return t;
  if (data.subscribed) return 'projects';
  return 'none';
}

export const MembershipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  // Avoid a failing public settings fetch on the logged-out login screen (preview CORS/504 noise).
  const betaModeEnabled =
    !!user || (typeof window !== 'undefined' && window.location.pathname !== '/auth');
  const { isBetaMode } = useBetaMode({ enabled: betaModeEnabled });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [inTrial, setInTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [lastTrialNotificationDate, setLastTrialNotificationDate] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('none');
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) {
      setIsSubscribed(false);
      setIsAdmin(false);
      setIsProjectOwner(false);
      setInTrial(false);
      setTrialEndDate(null);
      setLastTrialNotificationDate(null);
      setSubscriptionEnd(null);
      setSubscriptionTier('none');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      if (data.requiresReauth) {
        toast({
          title: 'Session Expired',
          description: 'Please sign in again to continue.',
          variant: 'destructive',
        });
        await supabase.auth.signOut();
        return;
      }

      setIsSubscribed(data.subscribed || false);
      setIsAdmin(data.isAdmin || false);
      setIsProjectOwner(data.isProjectOwner || false);
      setInTrial(data.inTrial || false);
      setTrialEndDate(data.trialEndDate || null);
      setLastTrialNotificationDate(data.lastTrialNotificationDate ?? null);
      setSubscriptionEnd(data.subscriptionEnd || null);
      setSubscriptionTier(normalizeTier(data));
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
        title: 'Error',
        description: 'Failed to create checkout session. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openCustomerPortal = async () => {
    if (isAdmin || isProjectOwner) {
      toast({
        title: 'Unlimited access',
        description: isAdmin
          ? 'Admin accounts have unlimited access and do not use Stripe billing.'
          : 'Project owner accounts have unlimited access and do not use Stripe billing.',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        let message = 'Failed to open customer portal. Please try again.';
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const body = await context.json();
            if (typeof body?.error === 'string') message = body.error;
          } catch {
            // keep default message
          }
        }
        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to open customer portal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const redeemCoupon = async (code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('redeem-coupon', {
        body: { code },
      });

      if (error) throw error;

      
      await checkSubscription();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to redeem coupon.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    void checkSubscription();

    const interval = setInterval(() => void checkSubscription(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || !inTrial || !trialEndDate || loading) return;

    const today = new Date().toISOString().slice(0, 10);
    const alreadyNotifiedToday = lastTrialNotificationDate === today;
    if (alreadyNotifiedToday) return;

    const showReminder = () => {
      const daysLeft = Math.max(
        0,
        Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      );
            setLastTrialNotificationDate(today);
      (supabase.rpc('record_trial_notification_shown') as any).then(() => {}).catch(() => {});
    };

    const t = setTimeout(showReminder, 1500);
    return () => clearTimeout(t);
  }, [user, inTrial, trialEndDate, loading, lastTrialNotificationDate, toast]);

  const hasProjectsTier = useMemo(
    () =>
      isBetaMode ||
      isAdmin ||
      isProjectOwner ||
      inTrial ||
      subscriptionTier === 'projects',
    [isBetaMode, isAdmin, isProjectOwner, inTrial, subscriptionTier]
  );

  const hasRiskLessTier = useMemo(
    () => hasProjectsTier || subscriptionTier === 'risk_less',
    [hasProjectsTier, subscriptionTier]
  );

  const canAccessPaidFeatures = isBetaMode || isAdmin || isProjectOwner || inTrial || isSubscribed;

  const canAccessApp = useCallback(
    (actionKey: string): boolean => {
      if (user && loading) return true;
      if ((PROJECTS_TIER_APP_ACTION_KEYS as readonly string[]).includes(actionKey)) {
        return hasProjectsTier;
      }
      if ((RISK_LESS_APP_ACTION_KEYS as readonly string[]).includes(actionKey)) {
        return hasRiskLessTier;
      }
      return true;
    },
    [hasProjectsTier, hasRiskLessTier, user, loading]
  );

  const trialDaysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <MembershipContext.Provider
      value={{
        isSubscribed,
        isAdmin,
        isProjectOwner,
        inTrial,
        trialEndDate,
        subscriptionEnd,
        loading,
        isBetaMode,
        subscriptionTier,
        hasProjectsTier,
        hasRiskLessTier,
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
