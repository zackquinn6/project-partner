import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { Button } from '@/components/ui/button';
import { Clock, Shield } from 'lucide-react';

export const SessionTimeoutWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);

  const { resetTimer, getRemainingTime } = useSessionTimeout({
    timeoutMinutes: 60,
    warningMinutes: 5,
    onWarning: () => setShowWarning(true),
    onTimeout: () => setShowTimeout(true)
  });

  const handleContinueSession = () => {
    setShowWarning(false);
    resetTimer();
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Session timeout warning */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Session Expiring Soon
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your session will expire in {formatTime(getRemainingTime())} due to inactivity. 
              Would you like to continue your session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <AlertDialogAction
              onClick={handleContinueSession}
              className="w-full sm:w-auto"
            >
              Continue Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session timeout notification */}
      <AlertDialog open={showTimeout} onOpenChange={() => {}}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Session Expired
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your session has expired due to inactivity for security reasons. 
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => window.location.reload()}>
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};