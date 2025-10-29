import React from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { MembershipStatusCard } from '@/components/MembershipStatusCard';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/contexts/MembershipContext';

interface MembershipWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MembershipWindow: React.FC<MembershipWindowProps> = ({ open, onOpenChange }) => {
  const { openCustomerPortal, isSubscribed } = useMembership();
  
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="modal-sm"
      title="Membership"
    >
      <div className="space-y-4">
        <MembershipStatusCard />
        {isSubscribed && (
          <Button 
            onClick={openCustomerPortal} 
            variant="outline" 
            className="w-full"
          >
            Manage Subscription
          </Button>
        )}
      </div>
    </ResponsiveDialog>
  );
};
