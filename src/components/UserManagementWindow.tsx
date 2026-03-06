import React from 'react';
import { UserRoleManager } from '@/components/UserRoleManager';
import { AgreementTemplatesSection } from '@/components/AgreementTemplatesSection';
import { ProjectOwnerInvitationsList } from '@/components/ProjectOwnerInvitationsList';
import { AdminMembershipManager } from '@/components/AdminMembershipManager';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserManagementWindow: React.FC<UserManagementWindowProps> = ({ open, onOpenChange }) => {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      size="content-large"
      title="User & Membership Management"
    >
      <Tabs defaultValue="roles" className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles" className="flex-1 overflow-y-auto">
          <UserRoleManager />
        </TabsContent>

        <TabsContent value="membership" className="flex-1 overflow-y-auto">
          <AdminMembershipManager />
        </TabsContent>

        <TabsContent value="invitations" className="flex-1 overflow-y-auto">
          <ProjectOwnerInvitationsList />
        </TabsContent>
        
        <TabsContent value="agreements" className="flex-1 overflow-y-auto space-y-8">
          <AgreementTemplatesSection />
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
};