import { supabase } from '@/integrations/supabase/client';

/**
 * Security utilities for automated maintenance and monitoring
 */

// Rate limiting storage for authentication attempts
const authAttempts = new Map<string, number[]>();
const MAX_AUTH_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Check if authentication attempts are within rate limits
 */
export const checkAuthRateLimit = (email: string): boolean => {
  const now = Date.now();
  const attempts = authAttempts.get(email) || [];
  
  // Remove attempts outside the window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // Update the map
  authAttempts.set(email, recentAttempts);
  
  return recentAttempts.length < MAX_AUTH_ATTEMPTS;
};

/**
 * Record an authentication attempt
 */
export const recordAuthAttempt = (email: string): void => {
  const attempts = authAttempts.get(email) || [];
  attempts.push(Date.now());
  authAttempts.set(email, attempts);
};

/**
 * Automated security maintenance functions
 */
export class SecurityMaintenance {
  private static instance: SecurityMaintenance;
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): SecurityMaintenance {
    if (!SecurityMaintenance.instance) {
      SecurityMaintenance.instance = new SecurityMaintenance();
    }
    return SecurityMaintenance.instance;
  }

  /**
   * Start automated security maintenance tasks
   */
  startMaintenance(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.runMaintenanceTasks();
    }, 24 * 60 * 60 * 1000);

    // Run initial cleanup after 5 minutes
    setTimeout(() => {
      this.runMaintenanceTasks();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop automated maintenance
   */
  stopMaintenance(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Execute all maintenance tasks
   */
  private async runMaintenanceTasks(): Promise<void> {
    try {
      await Promise.all([
        this.cleanupOldSessions(),
        this.cleanupOldAuditLogs(),
        this.cleanupOldFailedLogins()
      ]);
      console.log('Security maintenance tasks completed');
    } catch (error) {
      console.error('Security maintenance failed:', error);
    }
  }

  /**
   * Clean up old user sessions (90+ days)
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_sessions');
      if (error) throw error;
      if (data > 0) {
        console.log(`Cleaned up ${data} old sessions`);
      }
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Clean up old audit logs (1+ year)
   */
  private async cleanupOldAuditLogs(): Promise<void> {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { error } = await supabase
        .from('role_audit_log')
        .delete()
        .lt('created_at', oneYearAgo.toISOString());

      if (error) throw error;
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
    }
  }

  /**
   * Clean up old failed login attempts (90+ days)
   */
  private async cleanupOldFailedLogins(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { error } = await supabase
        .from('failed_login_attempts')
        .delete()
        .lt('attempted_at', ninetyDaysAgo.toISOString());

      if (error) throw error;
    } catch (error) {
      console.error('Failed to cleanup old failed login attempts:', error);
    }
  }

  /**
   * Get security metrics for monitoring
   */
  async getSecurityMetrics(): Promise<{
    recentFailedLogins: number;
    activeSessions: number;
    recentAuditActions: number;
  }> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
      const [failedLogins, activeSessions, auditActions] = await Promise.all([
        supabase
          .from('failed_login_attempts')
          .select('id', { count: 'exact' })
          .gte('attempted_at', twentyFourHoursAgo.toISOString()),
        
        supabase
          .from('user_sessions')
          .select('id', { count: 'exact' })
          .eq('is_active', true),
        
        supabase
          .from('role_audit_log')
          .select('id', { count: 'exact' })
          .gte('created_at', twentyFourHoursAgo.toISOString())
      ]);

      return {
        recentFailedLogins: failedLogins.count || 0,
        activeSessions: activeSessions.count || 0,
        recentAuditActions: auditActions.count || 0
      };
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      return {
        recentFailedLogins: 0,
        activeSessions: 0,
        recentAuditActions: 0
      };
    }
  }
}