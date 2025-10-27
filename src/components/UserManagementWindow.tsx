import React from 'react';
import { UserRoleManager } from '@/components/UserRoleManager';
import { ProjectAgreementsList } from '@/components/ProjectAgreementsList';
import { ProjectOwnerInvitationsList } from '@/components/ProjectOwnerInvitationsList';
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
      title="User Management"
    >
      <Tabs defaultValue="roles" className="w-full flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="roles">User Roles</TabsTrigger>
          <TabsTrigger value="invitations">Project Owner Invitations</TabsTrigger>
          <TabsTrigger value="agreements">Project Agreements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles" className="flex-1 overflow-y-auto">
          <UserRoleManager />
        </TabsContent>

        <TabsContent value="invitations" className="flex-1 overflow-y-auto">
          <ProjectOwnerInvitationsList />
        </TabsContent>
        
        <TabsContent value="agreements" className="flex-1 overflow-y-auto">
          <ProjectAgreementsList />
        </TabsContent>
      </Tabs>
    </ResponsiveDialog>
  );
};