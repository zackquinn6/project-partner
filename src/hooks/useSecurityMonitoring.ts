import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logSecurityEvent, checkEnhancedRateLimit } from '@/utils/enhancedSecurityLogger';

interface SecurityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context?: Record<string, any>;
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  // Monitor for suspicious patterns
  const monitorPattern = useCallback(async (pattern: string, data: any) => {
    if (!user) return;

    const violations: SecurityViolation[] = [];

    // Check for rapid-fire actions
    if (pattern === 'rapid_actions') {
      const allowed = await checkEnhancedRateLimit(
        user.id, 
        'user_actions', 
        50, // 50 actions per 5 minutes
        5
      );
      
      if (!allowed) {
        violations.push({
          type: 'rate_limit_violation',
          severity: 'medium',
          description: 'User exceeded action rate limit',
          context: data
        });
      }
    }

    // Check for suspicious form submissions
    if (pattern === 'form_submission') {
      const { formType, fieldCount, submissionTime } = data;
      
      // Unusually fast form submission (less than 2 seconds)
      if (submissionTime < 2000) {
        violations.push({
          type: 'suspicious_form_speed',
          severity: 'medium',
          description: `Form submitted unusually fast: ${submissionTime}ms`,
          context: { formType, fieldCount, submissionTime }
        });
      }

      // Too many form fields (potential automated attack)
      if (fieldCount > 50) {
        violations.push({
          type: 'excessive_form_fields',
          severity: 'high',
          description: `Form contains excessive fields: ${fieldCount}`,
          context: { formType, fieldCount }
        });
      }
    }

    // Check for suspicious navigation patterns
    if (pattern === 'navigation') {
      const { rapidNavigation, unusualPaths } = data;
      
      if (rapidNavigation > 10) {
        violations.push({
          type: 'rapid_navigation',
          severity: 'medium',
          description: `Rapid navigation detected: ${rapidNavigation} pages in 30 seconds`,
          context: data
        });
      }

      if (unusualPaths?.length > 0) {
        violations.push({
          type: 'unusual_path_access',
          severity: 'low',
          description: 'Access to unusual or non-existent paths detected',
          context: { paths: unusualPaths }
        });
      }
    }

    // Log violations
    for (const violation of violations) {
      await logSecurityEvent({
        eventType: violation.type,
        severity: violation.severity,
        description: violation.description,
        userId: user.id,
        userEmail: user.email,
        additionalData: violation.context
      });
    }

    return violations.length === 0;
  }, [user]);

  // Monitor browser security features
  useEffect(() => {
    if (!user) return;

    const checkBrowserSecurity = async () => {
      const securityContext = {
        userAgent: navigator.userAgent,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency,
        language: navigator.language,
        platform: navigator.platform,
        onLine: navigator.onLine
      };

      // Check for potential automation tools
      const suspiciousSignals = [];
      
      if ((window as any).webdriver) {
        suspiciousSignals.push('webdriver_detected');
      }
      
      if ((window as any).phantom) {
        suspiciousSignals.push('phantomjs_detected');
      }

      if (navigator.webdriver) {
        suspiciousSignals.push('automation_detected');
      }

      // Check for missing expected browser features
      if (!window.requestAnimationFrame) {
        suspiciousSignals.push('missing_animation_frame');
      }

      if (suspiciousSignals.length > 0) {
        await logSecurityEvent({
          eventType: 'automation_detection',
          severity: 'high',
          description: 'Potential automation or bot detected',
          userId: user.id,
          userEmail: user.email,
          additionalData: {
            signals: suspiciousSignals,
            context: securityContext
          }
        });
      }
    };

    // Run security check after a delay to avoid false positives
    const timeoutId = setTimeout(checkBrowserSecurity, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [user]);

  return {
    monitorPattern,
    logSecurityViolation: useCallback(async (type: string, description: string, severity: SecurityViolation['severity'] = 'medium', context?: any) => {
      if (!user) return;
      
      await logSecurityEvent({
        eventType: type,
        severity,
        description,
        userId: user.id,
        userEmail: user.email,
        additionalData: context
      });
    }, [user])
  };
};