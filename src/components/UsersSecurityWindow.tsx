import React from 'react';
import { UserRoleManager } from '@/components/UserRoleManager';
import { ProjectAgreementsList } from '@/components/ProjectAgreementsList';
import { SecurityMonitoringDashboard } from '@/components/SecurityMonitoringDashboard';
import { AdminSecurityDashboard } from '@/components/AdminSecurityDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsersSecurityWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UsersSecurityWindow: React.FC<UsersSecurityWindowProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Users & Security</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="roles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="roles">User Roles</TabsTrigger>
            <TabsTrigger value="agreements">Project Agreements</TabsTrigger>
            <TabsTrigger value="security">Security Events</TabsTrigger>
            <TabsTrigger value="admin-security">Admin Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roles" className="mt-6">
            <UserRoleManager />
          </TabsContent>
          
          <TabsContent value="agreements" className="mt-6">
            <ProjectAgreementsList />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <SecurityMonitoringDashboard />
          </TabsContent>

          <TabsContent value="admin-security" className="mt-6">
            <AdminSecurityDashboard />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};