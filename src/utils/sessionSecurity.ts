import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/utils/enhancedSecurityLogger';

interface SessionFingerprint {
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  hash: string;
}

/**
 * Generate a session fingerprint for additional security
 */
export const generateSessionFingerprint = (): SessionFingerprint => {
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const fingerprintData = {
    userAgent: navigator.userAgent,
    screen,
    timezone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled
  };

  // Create a simple hash of the fingerprint data
  const hash = btoa(JSON.stringify(fingerprintData))
    .replace(/[+/=]/g, '')
    .substring(0, 32);

  return {
    ...fingerprintData,
    hash
  };
};

/**
 * Store session fingerprint securely
 */
export const storeSessionFingerprint = async (fingerprint: SessionFingerprint, userId: string) => {
  try {
    sessionStorage.setItem('session_fp', fingerprint.hash);
    
    // Log the session creation with fingerprint
    await logSecurityEvent({
      eventType: 'session_created',
      severity: 'low',
      description: 'New session created with fingerprint',
      userId,
      additionalData: {
        fingerprintHash: fingerprint.hash,
        platform: fingerprint.platform,
        timezone: fingerprint.timezone
      }
    });
  } catch (error) {
    console.warn('Failed to store session fingerprint:', error);
  }
};

/**
 * Validate session fingerprint
 */
export const validateSessionFingerprint = async (userId: string): Promise<boolean> => {
  try {
    const storedHash = sessionStorage.getItem('session_fp');
    if (!storedHash) {
      return false;
    }

    const currentFingerprint = generateSessionFingerprint();
    
    if (storedHash !== currentFingerprint.hash) {
      // Log potential session hijacking
      await logSecurityEvent({
        eventType: 'session_fingerprint_mismatch',
        severity: 'high',
        description: 'Session fingerprint mismatch detected - potential session hijacking',
        userId,
        additionalData: {
          storedHash,
          currentHash: currentFingerprint.hash,
          userAgent: currentFingerprint.userAgent,
          platform: currentFingerprint.platform
        }
      });
      
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Failed to validate session fingerprint:', error);
    return false;
  }
};

/**
 * Clean up session data on logout
 */
export const cleanupSessionData = async (userId?: string) => {
  try {
    sessionStorage.removeItem('session_fp');
    
    if (userId) {
      await logSecurityEvent({
        eventType: 'session_cleanup',
        severity: 'low',
        description: 'Session data cleaned up on logout',
        userId
      });
    }
  } catch (error) {
    console.warn('Failed to cleanup session data:', error);
  }
};

/**
 * Check for concurrent sessions (basic implementation)
 */
export const checkConcurrentSessions = async (userId: string): Promise<boolean> => {
  try {
    // This is a basic implementation - in production you might want to use
    // a more sophisticated approach with server-side session tracking
    const { data: sessions, error } = await supabase
      .from('admin_sessions')
      .select('id, created_at, user_agent')
      .eq('admin_user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to check concurrent sessions:', error);
      return true; // Allow by default if check fails
    }

    // Allow up to 3 concurrent sessions per user
    if (sessions && sessions.length > 3) {
      await logSecurityEvent({
        eventType: 'excessive_concurrent_sessions',
        severity: 'medium',
        description: `User has ${sessions.length} concurrent sessions`,
        userId,
        additionalData: {
          sessionCount: sessions.length,
          sessions: sessions.map(s => ({
            id: s.id,
            userAgent: s.user_agent,
            createdAt: s.created_at
          }))
        }
      });
      
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Failed to check concurrent sessions:', error);
    return true; // Allow by default if check fails
  }
};

/**
 * Validate session integrity
 */
export const validateSessionIntegrity = async (userId: string, sessionToken?: string): Promise<boolean> => {
  try {
    // Check fingerprint
    const fingerprintValid = await validateSessionFingerprint(userId);
    if (!fingerprintValid) {
      return false;
    }

    // Check concurrent sessions
    const concurrentValid = await checkConcurrentSessions(userId);
    if (!concurrentValid) {
      return false;
    }

    // Additional integrity checks can be added here
    
    return true;
  } catch (error) {
    console.warn('Session integrity validation failed:', error);
    return false;
  }
};