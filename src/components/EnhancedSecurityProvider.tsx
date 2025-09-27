import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { SessionTimeoutWarning } from '@/components/SessionTimeoutWarning';

interface EnhancedSecurityProviderProps {
  children: React.ReactNode;
}

export const EnhancedSecurityProvider: React.FC<EnhancedSecurityProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { monitorPattern } = useSecurityMonitoring();

  useEffect(() => {
    if (!user) return;

    let navigationCount = 0;
    let navigationTimer: NodeJS.Timeout;
    const navigationHistory: string[] = [];

    // Monitor navigation patterns
    const handleNavigation = () => {
      navigationCount++;
      navigationHistory.push(window.location.pathname);
      
      // Reset counter after 30 seconds
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(() => {
        if (navigationCount > 0) {
          monitorPattern('navigation', {
            rapidNavigation: navigationCount,
            unusualPaths: navigationHistory.filter(path => 
              !path.match(/^\/($|auth|admin|project|home|profile)/)
            )
          });
        }
        navigationCount = 0;
        navigationHistory.length = 0;
      }, 30000);
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleNavigation);
    
    // Monitor for rapid form submissions
    let actionCount = 0;
    let actionTimer: NodeJS.Timeout;

    const handleUserAction = () => {
      actionCount++;
      
      clearTimeout(actionTimer);
      actionTimer = setTimeout(() => {
        if (actionCount > 20) {
          monitorPattern('rapid_actions', {
            actionCount,
            timeWindow: '5 minutes'
          });
        }
        actionCount = 0;
      }, 300000); // 5 minutes
    };

    // Monitor various user actions
    const actionEvents = ['click', 'submit', 'keydown'];
    actionEvents.forEach(event => {
      document.addEventListener(event, handleUserAction, { passive: true });
    });

    return () => {
      window.removeEventListener('popstate', handleNavigation);
      actionEvents.forEach(event => {
        document.removeEventListener(event, handleUserAction);
      });
      clearTimeout(navigationTimer);
      clearTimeout(actionTimer);
    };
  }, [user, monitorPattern]);

  return (
    <>
      {children}
      {user && <SessionTimeoutWarning />}
    </>
  );
};