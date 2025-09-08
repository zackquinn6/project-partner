import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced security event logging system
 */

export interface SecurityEvent {
  eventType: 'auth_attempt' | 'privilege_escalation' | 'data_access' | 'admin_action' | 'rate_limit_exceeded' | 'input_validation_failed' | 'csrf_validation_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

/**
 * Log security events to Supabase
 */
export const logSecurityEvent = async (event: SecurityEvent): Promise<void> => {
  try {
    // Use the existing log_security_event function
    const { error } = await supabase.rpc('log_security_event', {
      event_type: event.eventType,
      event_description: `${event.severity.toUpperCase()}: ${event.description}${event.additionalData ? ` | Data: ${JSON.stringify(event.additionalData)}` : ''}`,
      user_email: event.userEmail,
      ip_addr: event.ipAddress
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

/**
 * Log authentication attempts
 */
export const logAuthAttempt = async (email: string, success: boolean, ipAddress?: string, userAgent?: string): Promise<void> => {
  await logSecurityEvent({
    eventType: 'auth_attempt',
    severity: success ? 'low' : 'medium',
    description: `Authentication ${success ? 'successful' : 'failed'} for ${email}`,
    userEmail: email,
    ipAddress,
    userAgent
  });
};

/**
 * Log privilege escalation attempts
 */
export const logPrivilegeEscalation = async (userId: string, targetUserId: string, action: string, success: boolean): Promise<void> => {
  await logSecurityEvent({
    eventType: 'privilege_escalation',
    severity: success ? 'high' : 'critical',
    description: `${success ? 'Successful' : 'Failed'} privilege escalation: ${action}`,
    userId,
    additionalData: { targetUserId, action }
  });
};

/**
 * Log admin actions
 */
export const logAdminAction = async (userId: string, action: string, targetResource?: string): Promise<void> => {
  await logSecurityEvent({
    eventType: 'admin_action',
    severity: 'medium',
    description: `Admin action: ${action}`,
    userId,
    additionalData: { action, targetResource }
  });
};

/**
 * Log rate limit exceeded events
 */
export const logRateLimitExceeded = async (operation: string, identifier: string, ipAddress?: string): Promise<void> => {
  await logSecurityEvent({
    eventType: 'rate_limit_exceeded',
    severity: 'medium',
    description: `Rate limit exceeded for operation: ${operation}`,
    ipAddress,
    additionalData: { operation, identifier }
  });
};

/**
 * Log input validation failures
 */
export const logInputValidationFailure = async (field: string, value: string, userId?: string): Promise<void> => {
  await logSecurityEvent({
    eventType: 'input_validation_failed',
    severity: 'medium',
    description: `Input validation failed for field: ${field}`,
    userId,
    additionalData: { field, sanitizedValue: value.substring(0, 100) } // Log only first 100 chars for security
  });
};

/**
 * Log CSRF validation failures
 */
export const logCSRFValidationFailure = async (userId?: string, ipAddress?: string, userAgent?: string): Promise<void> => {
  await logSecurityEvent({
    eventType: 'csrf_validation_failed',
    severity: 'high',
    description: 'CSRF token validation failed',
    userId,
    ipAddress,
    userAgent
  });
};

/**
 * Get client IP address (best effort in browser environment)
 */
export const getClientInfo = (): { ipAddress?: string; userAgent?: string } => {
  return {
    userAgent: navigator.userAgent,
    // IP address detection in browser is limited for privacy reasons
    // This would need to be implemented server-side for accurate IP detection
  };
};