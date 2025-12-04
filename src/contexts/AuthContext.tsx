import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { checkAuthRateLimit, recordAuthAttempt } from '@/utils/securityUtils';
import { sanitizeInput } from '@/utils/inputSanitization';
import { logAuthenticationEvent, logSecurityViolation } from '@/utils/enhancedSecurityLogger';
import { 
  generateSessionFingerprint, 
  storeSessionFingerprint, 
  validateSessionIntegrity,
  cleanupSessionData
} from '@/utils/sessionSecurity';
import { useGuest } from './GuestContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signingOut: boolean;
  signUp: (email: string, password: string, guestData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    let hasRedirected = false; // Prevent multiple redirects
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle email confirmation - redirect to home ONLY from auth page
        // Only redirect once and only if on /auth page to avoid infinite loops
        if (event === 'SIGNED_IN' && session?.user && !hasRedirected && window.location.pathname === '/auth') {
          console.log('✅ User signed in via email confirmation - redirecting from auth page');
          hasRedirected = true;
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, guestData?: any) => {
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
    
    // Use production URL for email confirmation links - redirect to auth page
    // After confirmation, user will be signed in and redirected to home/projects
    const redirectUrl = 'https://projectpartner.toolio.us/auth';
    
    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
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
    
    // Check server-side rate limiting
    try {
      const { data: rateLimitResult } = await supabase.functions.invoke('auth-rate-limit', {
        body: {
          email: sanitizedEmail,
          action: 'check'
        }
      });
      
      if (!rateLimitResult?.allowed) {
        await logSecurityViolation(
          'rate_limit_exceeded',
          `Authentication rate limit exceeded for ${sanitizedEmail}`,
          'medium',
          { email: sanitizedEmail }
        );
        return { error: { message: 'Too many login attempts. Please try again later.' } };
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, falling back to client-side:', rateLimitError);
      // Fallback to client-side rate limiting
      if (!checkAuthRateLimit(sanitizedEmail)) {
        await logSecurityViolation(
          'rate_limit_exceeded',
          `Authentication rate limit exceeded for ${sanitizedEmail} (client-side)`,
          'medium',
          { email: sanitizedEmail }
        );
        return { error: { message: 'Too many login attempts. Please try again later.' } };
      }
      recordAuthAttempt(sanitizedEmail);
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
      try {
        await supabase.functions.invoke('auth-rate-limit', {
          body: {
            email: sanitizedEmail,
            action: 'record_failure',
            user_agent: navigator.userAgent
          }
        });
      } catch (logError) {
        console.warn('Failed to log login attempt on server:', logError);
        // Fallback to client-side logging
        try {
          await supabase.rpc('log_failed_login', {
            user_email: sanitizedEmail,
            ip_addr: null,
            user_agent_string: navigator.userAgent
          });
        } catch (fallbackError) {
          console.warn('Failed to log login attempt:', fallbackError);
        }
      }

      await logSecurityViolation(
        'authentication_failed',
        `Failed login attempt for ${sanitizedEmail}: ${error.message}`,
        'medium',
        { email: sanitizedEmail, errorCode: error.message }
      );
    }
    
    return { error };
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

  const signOut = async () => {
    if (signingOut) return; // Prevent multiple sign out attempts
    
    try {
      setSigningOut(true);
      // Clean up session data before signing out
      await cleanupSessionData(user?.id);
      await supabase.auth.signOut();
    } catch (error: any) {
      // Gracefully handle session_not_found errors (we're already signed out)
      if (error?.message?.includes('session_not_found') || error?.code === 'session_not_found') {
        console.log('Already signed out');
      } else {
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
    signOut,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};