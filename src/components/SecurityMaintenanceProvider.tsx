import React from 'react';
import { useSecurityMaintenance } from '@/hooks/useSecurityMaintenance';

interface SecurityMaintenanceProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages automated security maintenance tasks
 * Wraps the app to ensure security tasks run in the background
 */
export const SecurityMaintenanceProvider: React.FC<SecurityMaintenanceProviderProps> = ({ children }) => {
  // This hook handles all the security maintenance logic
  useSecurityMaintenance();

  // This provider doesn't need to expose any context
  // It just ensures the security maintenance runs
  return <>{children}</>;
};