import React from 'react';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { MembershipStatusCard } from '@/components/MembershipStatusCard';
import { PasswordSecurityManager } from '@/components/PasswordSecurityManager';
import { UserDataManagement } from '@/components/UserDataManagement';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMembership } from '@/contexts/MembershipContext';

interface AccountProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Account: React.FC<AccountProps> = ({ open, onOpenChange }) => {
  const { openCustomerPortal } = useMembership();

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="content-large"
      title="Account"
    >
      <Tabs defaultValue="membership" className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="security">Password & Security</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="membership" className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <MembershipStatusCard />
            <Button
              onClick={openCustomerPortal}
              variant="outline"
              className="w-full"
            >
              Manage Subscription
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="flex-1 overflow-y-auto">
          <PasswordSecurityManager />
        </TabsContent>

        <TabsContent value="privacy" className="flex-1 overflow-y-auto">
          <UserDataManagement />
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
};
