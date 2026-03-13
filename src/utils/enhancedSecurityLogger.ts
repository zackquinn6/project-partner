import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced security logger using the new comprehensive security logging system
 */

export interface SecurityEventData {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

/**
 * Log comprehensive security events to the enhanced security system
 */
export const logSecurityEvent = async (eventData: SecurityEventData): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_comprehensive_security_event', {
      p_event_type: eventData.eventType,
      p_severity: eventData.severity,
      p_description: eventData.description,
      p_user_id: eventData.userId,
      p_user_email: eventData.userEmail,
      p_ip_address: eventData.ipAddress,
      p_user_agent: eventData.userAgent,
      p_additional_data: eventData.additionalData || {}
    });

    if (error) {
      if (error.code !== 'PGRST202') {
        console.error('Failed to log security event:', error);
      }
    }
  } catch (error) {
    // RPC may not exist (PGRST202); avoid noisy console in that case
    const err = error as { code?: string };
    if (err?.code !== 'PGRST202') {
      console.error('Error logging security event:', error);
    }
  }
};

/**
 * Check enhanced rate limits with comprehensive logging
 */
export const checkEnhancedRateLimit = async (
  identifier: string,
  operationType: string,
  maxAttempts: number = 10,
  windowMinutes: number = 15
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('enhanced_rate_limit_check', {
      identifier,
      operation_type: operationType,
      max_attempts: maxAttempts,
      window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
};

/**
 * Log authentication events with enhanced security context
 */
export const logAuthenticationEvent = async (
  email: string,
  success: boolean,
  method: string = 'email',
  additionalContext?: Record<string, any>
): Promise<void> => {
  await logSecurityEvent({
    eventType: success ? 'authentication_success' : 'authentication_failed',
    severity: success ? 'low' : 'medium',
    description: `${success ? 'Successful' : 'Failed'} authentication using ${method} for ${email}`,
    userEmail: email,
    userAgent: navigator.userAgent,
    additionalData: {
      method,
      ...additionalContext
    }
  });
};

/**
 * Log admin actions with comprehensive context
 */
export const logAdminAction = async (
  action: string,
  targetResource: string,
  success: boolean = true,
  additionalData?: Record<string, any>
): Promise<void> => {
  await logSecurityEvent({
    eventType: 'admin_action',
    severity: success ? 'medium' : 'high',
    description: `Admin ${success ? 'successfully' : 'failed to'} ${action} on ${targetResource}`,
    userAgent: navigator.userAgent,
    additionalData: {
      action,
      targetResource,
      success,
      ...additionalData
    }
  });
};

/**
 * Log data access events for sensitive operations
 */
export const logDataAccess = async (
  table: string,
  operation: string,
  recordCount?: number,
  filters?: Record<string, any>
): Promise<void> => {
  await logSecurityEvent({
    eventType: 'data_access',
    severity: 'low',
    description: `Accessed ${table} table with ${operation} operation`,
    userAgent: navigator.userAgent,
    additionalData: {
      table,
      operation,
      recordCount,
      filters
    }
  });
};

/**
 * Log security violations or suspicious activities
 */
export const logSecurityViolation = async (
  violationType: string,
  details: string,
  severity: 'medium' | 'high' | 'critical' = 'high',
  context?: Record<string, any>
): Promise<void> => {
  await logSecurityEvent({
    eventType: 'security_violation',
    severity,
    description: `Security violation: ${violationType} - ${details}`,
    userAgent: navigator.userAgent,
    additionalData: {
      violationType,
      context
    }
  });
};

/**
 * Get client information for security logging
 */
export const getClientSecurityContext = (): {
  userAgent: string;
  timestamp: number;
  timezone: string;
  language: string;
} => {
  return {
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language
  };
};