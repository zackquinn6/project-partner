import React from 'react';
import { UserRoleManager } from '@/components/UserRoleManager';
import { ProjectAgreementsList } from '@/components/ProjectAgreementsList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserManagementWindow: React.FC<UserManagementWindowProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Management</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles">User Roles</TabsTrigger>
            <TabsTrigger value="agreements">Project Agreements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roles" className="mt-6">
            <UserRoleManager />
          </TabsContent>
          
          <TabsContent value="agreements" className="mt-6">
            <ProjectAgreementsList />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};