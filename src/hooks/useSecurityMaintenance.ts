import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SecurityMaintenance } from '@/utils/securityUtils';

/**
 * Hook to manage automated security maintenance tasks
 * Only runs for authenticated admin users to prevent unnecessary API calls
 */
export const useSecurityMaintenance = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const maintenance = SecurityMaintenance.getInstance();
    
    // Start maintenance tasks
    maintenance.startMaintenance();

    // Cleanup on unmount
    return () => {
      maintenance.stopMaintenance();
    };
  }, [user]);

  return {
    getSecurityMetrics: () => SecurityMaintenance.getInstance().getSecurityMetrics()
  };
};