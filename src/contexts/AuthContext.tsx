import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session, type Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logAuthenticationEvent } from '@/utils/enhancedSecurityLogger';
import { cleanupSessionData } from '@/utils/sessionSecurity';
import { useGuest } from './GuestContext';
import { ensureDefaultHomeForUser } from '@/utils/ensureDefaultHome';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  signInWithToolio: (redirectTo: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Supabase custom OIDC provider backed by Toolio's OAuth server. supabase-js 2.55's `Provider`
 * union predates `custom:` identifiers; the client passes the string through to /authorize unchanged.
 */
const TOOLIO_PROVIDER = 'custom:toolio' as Provider;
/** Set before the Toolio redirect so the return trip can be logged as a success or failure. */
const TOOLIO_SIGN_IN_PENDING_KEY = 'pp_toolio_sign_in_pending';

async function insertGuestProjectRuns(userId: string, projectRuns: any[]) {
  for (const projectRun of projectRuns) {
    const { id, createdAt, updatedAt, ...runData } = projectRun;
    await supabase.from('project_runs').insert({
      ...runData,
      user_id: userId,
      phases: JSON.stringify(runData.phases),
      completed_steps: JSON.stringify(runData.completedSteps)
    });
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const { transferGuestDataToUser, guestData } = useGuest();
  const guestRunsRef = useRef(guestData.projectRuns);
  guestRunsRef.current = guestData.projectRuns;

  /** What the email sign-in and sign-up paths do, for a Toolio sign-in that just returned. */
  const completeToolioSignIn = async (signedIn: User) => {
    await logAuthenticationEvent(signedIn.email ?? signedIn.id, true, 'toolio_oauth', {
      linked_providers: signedIn.app_metadata?.providers ?? [],
    });
    const { error: sessionErr } = await supabase.from('user_sessions').insert({
      user_id: signedIn.id,
      user_agent: navigator.userAgent
    });
    if (sessionErr && sessionErr.code !== 'PGRST204' && sessionErr.code !== '42P01') {
      console.error('Failed to create session log:', sessionErr);
    }
    if (guestRunsRef.current.length > 0) {
      try {
        await insertGuestProjectRuns(signedIn.id, guestRunsRef.current);
        await transferGuestDataToUser(signedIn.id);
      } catch (transferError) {
        console.error('Failed to transfer guest data:', transferError);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const applySession = (nextSession: Session | null) => {
      if (cancelled) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        applySession(nextSession);
        if (event === 'SIGNED_IN' && nextSession && sessionStorage.getItem(TOOLIO_SIGN_IN_PENDING_KEY)) {
          sessionStorage.removeItem(TOOLIO_SIGN_IN_PENDING_KEY);
          // Supabase holds an auth lock during this callback; awaited queries must run after it.
          setTimeout(() => void completeToolioSignIn(nextSession.user), 0);
        }
      }
    );

    if (sessionStorage.getItem(TOOLIO_SIGN_IN_PENDING_KEY)) {
      const returned = new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`);
      const oauthError = returned.get('error_description') ?? returned.get('error');
      if (oauthError) {
        sessionStorage.removeItem(TOOLIO_SIGN_IN_PENDING_KEY);
        void logAuthenticationEvent('toolio_oauth', false, 'toolio_oauth', { error: oauthError });
      }
    }

    // Preview iframes / tracking prevention can fail token refresh with "Failed to fetch".
    // Never leave the app stuck waiting on auth initialization.
    const initTimeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    void supabase.auth
      .getSession()
      .then(({ data: { session: nextSession } }) => {
        window.clearTimeout(initTimeout);
        applySession(nextSession);
      })
      .catch((err) => {
        // Rejected getSession (e.g. token refresh network error) must clear loading;
        // otherwise /auth stays on the spinner forever.
        window.clearTimeout(initTimeout);
        console.error('Auth getSession failed:', err);
        applySession(null);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id || loading) return;
    void ensureDefaultHomeForUser(user.id).catch((err) => {
      console.error('ensureDefaultHomeForUser failed:', err);
    });
  }, [user?.id, loading]);

  /** Signs in through Toolio; an existing account with the same verified email is linked, not duplicated. */
  const signInWithToolio = async (redirectTo: string): Promise<{ error: { message: string } | null }> => {
    sessionStorage.setItem(TOOLIO_SIGN_IN_PENDING_KEY, String(Date.now()));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: TOOLIO_PROVIDER,
      options: { redirectTo },
    });
    if (error) {
      sessionStorage.removeItem(TOOLIO_SIGN_IN_PENDING_KEY);
      await logAuthenticationEvent('toolio_oauth', false, 'toolio_oauth', { error: error.message });
      return { error: { message: error.message } };
    }
    return { error: null };
  };

  const signOut = async () => {
    if (signingOut) return; // Prevent multiple sign out attempts
    
    try {
      setSigningOut(true);
      // Clean up session data before signing out
      await cleanupSessionData(user?.id);
      await supabase.auth.signOut();
    } catch (error: any) {
      // Gracefully handle session_not_found errors (we're already signed out)
      if (!(error?.message?.includes('session_not_found') || error?.code === 'session_not_found')) {
        console.error('Sign out error:', error);
        throw error;
      }
    } finally {
      setSigningOut(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signingOut,
    signInWithToolio,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};