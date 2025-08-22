import React, { useState } from 'react';
import { ProjectManagementWindow } from '@/components/ProjectManagementWindow';
import { ProjectAnalyticsWindow } from '@/components/ProjectAnalyticsWindow';
import { UserRolesWindow } from '@/components/UserRolesWindow';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { SecurityDashboard } from '@/components/SecurityDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, BarChart3, Shield, Wrench, Lock } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [projectManagementOpen, setProjectManagementOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [userRolesOpen, setUserRolesOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [securityDashboardOpen, setSecurityDashboardOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-primary">Administration Panel</h1>
          <p className="text-lg text-muted-foreground">Manage projects, analytics, and user permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setProjectManagementOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Project Management</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage project workflows, materials, tools, and rollups
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setProjectManagementOpen(true)}>
                Project Management
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setAnalyticsOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Project Analytics</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                View project metrics, completion rates, and performance data
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setAnalyticsOpen(true)}>
                Open Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setUserRolesOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>User Roles</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage user permissions and access control
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setUserRolesOpen(true)}>
                Manage User Roles
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setToolsMaterialsOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Tools & Materials Library</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage reusable tools and materials for projects
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setToolsMaterialsOpen(true)}>
                Open Library
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setSecurityDashboardOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Security Dashboard</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Monitor security, audit logs, and failed login attempts
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setSecurityDashboardOpen(true)}>
                Security Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        <ProjectManagementWindow 
          open={projectManagementOpen} 
          onOpenChange={setProjectManagementOpen} 
        />
        
        <ProjectAnalyticsWindow 
          open={analyticsOpen} 
          onOpenChange={setAnalyticsOpen} 
        />
        
        <UserRolesWindow 
          open={userRolesOpen} 
          onOpenChange={setUserRolesOpen} 
        />
        
        <ToolsMaterialsWindow 
          open={toolsMaterialsOpen} 
          onOpenChange={setToolsMaterialsOpen} 
        />
        
        <Dialog open={securityDashboardOpen} onOpenChange={setSecurityDashboardOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Security Dashboard</DialogTitle>
            </DialogHeader>
            <SecurityDashboard />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};