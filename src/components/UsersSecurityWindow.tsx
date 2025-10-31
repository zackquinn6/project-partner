import React from 'react';
import { UserRoleManager } from '@/components/UserRoleManager';
import { ProjectAgreementsList } from '@/components/ProjectAgreementsList';
import { SecurityMonitoringDashboard } from '@/components/SecurityMonitoringDashboard';
import { AdminSecurityDashboard } from '@/components/AdminSecurityDashboard';
import { ProjectOwnerInvitationsList } from '@/components/ProjectOwnerInvitationsList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UsersSecurityWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UsersSecurityWindow: React.FC<UsersSecurityWindowProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg md:text-xl font-bold">Users & Security</DialogTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)} 
              className="h-7 px-2 text-[9px] md:text-xs"
            >
              Close
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="roles" className="text-xs md:text-sm">User Roles</TabsTrigger>
              <TabsTrigger value="invitations" className="text-xs md:text-sm">Invitations</TabsTrigger>
              <TabsTrigger value="agreements" className="text-xs md:text-sm">Agreements</TabsTrigger>
              <TabsTrigger value="security" className="text-xs md:text-sm">Security Events</TabsTrigger>
              <TabsTrigger value="admin-security" className="text-xs md:text-sm">Admin Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="roles" className="mt-4">
              <UserRoleManager />
            </TabsContent>

            <TabsContent value="invitations" className="mt-4">
              <ProjectOwnerInvitationsList />
            </TabsContent>
            
            <TabsContent value="agreements" className="mt-4">
              <ProjectAgreementsList />
            </TabsContent>

            <TabsContent value="security" className="mt-4">
              <SecurityMonitoringDashboard />
            </TabsContent>

            <TabsContent value="admin-security" className="mt-4">
              <AdminSecurityDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};