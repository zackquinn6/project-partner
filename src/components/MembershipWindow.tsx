import React from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { MembershipManagement } from '@/components/MembershipManagement';

interface MembershipWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MembershipWindow: React.FC<MembershipWindowProps> = ({ open, onOpenChange }) => {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="modal-md"
      title="Membership & Subscription"
    >
      <div className="overflow-y-auto">
        <MembershipManagement />
      </div>
    </ResponsiveDialog>
  );
};
