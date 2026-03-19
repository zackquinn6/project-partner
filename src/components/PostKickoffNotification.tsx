import React, { useEffect, useState } from 'react';

interface PostKickoffNotificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDontShowAgain?: (dontShow: boolean) => void;
}

export const PostKickoffNotification: React.FC<PostKickoffNotificationProps> = ({
  open,
  onOpenChange,
  onDontShowAgain
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // User requested this popup to be removed; dismiss it immediately when it would open.
  useEffect(() => {
    if (open) onOpenChange(false);
  }, [open, onOpenChange]);

  const handleGetStarted = () => {
    if (dontShowAgain && onDontShowAgain) {
      onDontShowAgain(true);
    }
    onOpenChange(false);
  };

  // Render nothing (popup removed).
  return null;
};

