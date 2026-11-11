import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, type Provider } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeInput } from '@/utils/inputSanitization';
import { logAuthenticationEvent, logSecurityViolation } from '@/utils/enhancedSecurityLogger';
import { cleanupSessionData } from '@/utils/sessionSecurity';
import { useGuest } from './GuestContext';
import { ensureDefaultHomeForUser } from '@/utils/ensureDefaultHome';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  signUp: (email: string, password: string, guestData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithToolio: () => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Supabase custom OIDC provider backed by Toolio's OAuth server. supabase-js 2.55's `Provider`
 * union predates `custom:` identifiers; the client passes the string through to /authorize unchanged.
 */
const TOOLIO_PROVIDER = 'custom:toolio' as Provider;
/** Set before the Toolio redirect so the return trip can be logged as a success or failure. */
const TOOLIO_SIGN_IN_PENDING_KEY = 'pp_toolio_sign_in_pending';

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
  const { setGuestMode, transferGuestDataToUser } = useGuest();

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
          void logAuthenticationEvent(nextSession.user.email ?? nextSession.user.id, true, 'toolio_oauth', {
            linked_providers: nextSession.user.app_metadata?.providers ?? [],
          });
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

  const signUp = async (email: string, password: string, guestData?: any) => {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
    
    const explicitRedirect = import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL;
    const redirectUrl =
      typeof explicitRedirect === 'string' && explicitRedirect.trim() !== ''
        ? explicitRedirect.trim()
        : `${window.location.origin}/auth`;

    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    // Log sign-up attempt
    await logAuthenticationEvent(sanitizedEmail, !error, 'email_signup', {
      redirectUrl,
      timestamp: Date.now()
    });

    if (error) {
      await logSecurityViolation(
        'signup_failed',
        `Sign-up failed for ${sanitizedEmail}: ${error.message}`,
        'medium',
        { email: sanitizedEmail, errorCode: error.message }
      );
    } else if (guestData) {
      // Transfer guest data after successful signup
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (user && guestData.projectRuns?.length > 0) {
          // Transfer guest project runs to real user
          for (const projectRun of guestData.projectRuns) {
            const { id, createdAt, updatedAt, ...runData } = projectRun;
            await supabase.from('project_runs').insert({
              ...runData,
              user_id: user.id,
              phases: JSON.stringify(runData.phases),
              completed_steps: JSON.stringify(runData.completedSteps)
            });
          }
        }
      } catch (transferError) {
        console.error('Failed to transfer guest data:', transferError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
    const LOGIN_TIMEOUT_MS = 8000;
    const LOGIN_TIMEOUT_MESSAGE = 'Login failed. Try again later.';

    const runSignIn = async (): Promise<{ error: any }> => {
      // Primary path: server rate-limit gate. Deny on explicit allowed=false or transport failure.
      const { data: rateLimitResult, error: rateLimitError } = await supabase.functions.invoke('auth-rate-limit', {
        body: {
          email: sanitizedEmail,
          action: 'check',
        },
      });

      if (rateLimitError || rateLimitResult?.allowed === false) {
        await logSecurityViolation(
          'rate_limit_exceeded',
          `Authentication rate limit exceeded for ${sanitizedEmail}`,
          'medium',
          { email: sanitizedEmail }
        );
        return { error: { message: 'Too many login attempts. Please try again later.' } };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      // Log authentication attempt
      await logAuthenticationEvent(sanitizedEmail, !error, 'email', {
        timestamp: Date.now()
      });
      
      // Log failed login attempts on server
      if (error) {
        await supabase.functions.invoke('auth-rate-limit', {
          body: {
            email: sanitizedEmail,
            action: 'record_failure',
            user_agent: navigator.userAgent
          }
        });

        await logSecurityViolation(
          'authentication_failed',
          `Failed login attempt for ${sanitizedEmail}: ${error.message}`,
          'medium',
          { email: sanitizedEmail, errorCode: error.message }
        );
      }
      
      return { error };
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        runSignIn(),
        new Promise<{ error: { message: string } }>((resolve) => {
          timeoutId = setTimeout(() => {
            resolve({ error: { message: LOGIN_TIMEOUT_MESSAGE } });
          }, LOGIN_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      // Log OAuth attempt
      await logAuthenticationEvent('google_oauth', !error, 'google', {
        redirectTo: `${window.location.origin}/`,
        timestamp: Date.now()
      });
      
      if (error) {
        await logSecurityViolation(
          'oauth_failed',
          `Google OAuth authentication failed: ${error.message}`,
          'medium',
          { provider: 'google', errorCode: error.message }
        );

        // Show user-friendly error message and recommend direct signup
        const userFriendlyError = { 
          message: 'Google sign-up is currently experiencing issues. Please try signing up directly with your email and password instead.' 
        };
        return { error: userFriendlyError };
      }
      
      return { error };
    } catch (err) {
      await logSecurityViolation(
        'oauth_error',
        `Google OAuth unexpected error: ${err}`,
        'medium',
        { provider: 'google', error: String(err) }
      );

      // Fallback error for any unexpected issues
      return { 
        error: { 
          message: 'Google sign-up is currently experiencing issues. Please try signing up directly with your email and password instead.' 
        } 
      };
    }
  };

  /** Signs in through Toolio; an existing account with the same verified email is linked, not duplicated. */
  const signInWithToolio = async (): Promise<{ error: { message: string } | null }> => {
    sessionStorage.setItem(TOOLIO_SIGN_IN_PENDING_KEY, String(Date.now()));
    const { error } = await supabase.auth.signInWithOAuth({
      provider: TOOLIO_PROVIDER,
      options: { redirectTo: `${window.location.origin}/` },
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

  const continueAsGuest = () => {
    setGuestMode(true);
    setLoading(false);
  };

  const value = {
    user,
    session,
    loading,
    signingOut,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithToolio,
    signOut,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};