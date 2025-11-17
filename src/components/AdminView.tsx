import React, { useState, useEffect } from 'react';
import { UnifiedProjectManagement } from '@/components/UnifiedProjectManagement';
import { ProjectAnalyticsWindow } from '@/components/ProjectAnalyticsWindow';
import { UsersSecurityWindow } from '@/components/UsersSecurityWindow';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { HomeRiskManager } from '@/components/HomeRiskManager';
import { AdminActionCenter } from '@/components/AdminActionCenter';
import EditWorkflowView from '@/components/EditWorkflowView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, BarChart3, Shield, Wrench, AlertTriangle, RefreshCw, Bell, FileText, MapPin, Cog, RefreshCcw, Edit, Grid3x3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StructureManager } from './StructureManager';
import { AdminRoadmapManager } from './AdminRoadmapManager';
import { AdminFeatureRequestManager } from './AdminFeatureRequestManager';
import { AdminDataRefresh } from './AdminDataRefresh';
import { AdminGuideWindow } from './AdminGuideWindow';
import { PFMEAManagement } from './PFMEAManagement';
import { BetaModeToggle } from './BetaModeToggle';
import { AppManager } from './AppManager';
export const AdminView: React.FC = () => {
  const [enhancedProjectManagementOpen, setEnhancedProjectManagementOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [usersSecurityOpen, setUsersSecurityOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [homeRiskManagerOpen, setHomeRiskManagerOpen] = useState(false);
  const [editWorkflowOpen, setEditWorkflowOpen] = useState(false);
  const [structureManagerOpen, setStructureManagerOpen] = useState(false);
  const [processDesignOpen, setProcessDesignOpen] = useState(false);
  const [roadmapManagerOpen, setRoadmapManagerOpen] = useState(false);
  const [featureRequestManagerOpen, setFeatureRequestManagerOpen] = useState(false);
  const [adminGuideOpen, setAdminGuideOpen] = useState(false);
  const [dataRefreshOpen, setDataRefreshOpen] = useState(false);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [appManagerOpen, setAppManagerOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'admin' | 'structure-manager'>('admin');

  if (currentView === 'structure-manager') {
    return <StructureManager onBack={() => setCurrentView('admin')} />;
  }
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl font-bold text-primary">Administration Panel</h1>
            <Button variant="outline" size="sm" onClick={() => setAdminGuideOpen(true)} className="text-xs">
              <FileText className="w-4 h-4 mr-2" />
              Admin Guide
            </Button>
            
          </div>
          <p className="text-lg text-muted-foreground">Manage projects, analytics, and user permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setActionCenterOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-primary" />
              </div>
               <CardTitle>Action Center</CardTitle>
               <CardDescription className="min-h-[3rem] flex items-center justify-center">
                 Review pending actions and phase revision updates
               </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
               <Button className="w-full" onClick={() => setActionCenterOpen(true)}>
                 Open Action Center
               </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setEnhancedProjectManagementOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-primary" />
              </div>
               <CardTitle>Project Management</CardTitle>
               <CardDescription className="min-h-[3rem] flex items-center justify-center">
                 Unified project management with integrated revision control
               </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
               <Button className="w-full" onClick={() => setEnhancedProjectManagementOpen(true)}>
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

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setUsersSecurityOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Users & Security</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage user roles, permissions, agreements, and monitor security
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setUsersSecurityOpen(true)}>
                Users & Security
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


          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setHomeRiskManagerOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Home Risks</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage construction risks based on home build years
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setHomeRiskManagerOpen(true)}>
                Home Risks
              </Button>
            </CardContent>
          </Card>


          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setRoadmapManagerOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Roadmap</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage feature roadmap items and user feature requests
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setRoadmapManagerOpen(true)}>
                Roadmap Management
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setProcessDesignOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Cog className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Process FMEA</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Process Failure Mode & Effects Analysis - identify and mitigate potential process failures
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setProcessDesignOpen(true)}>
                Process FMEA
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setDataRefreshOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Data Refresh</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage internet data refresh for tool rentals and community posts
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setDataRefreshOpen(true)}>
                Data Management
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setAppManagerOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Grid3x3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>App Manager</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Manage all apps: native apps, external apps, and workspace apps
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setAppManagerOpen(true)}>
                App Manager
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Beta Mode Toggle */}
        <BetaModeToggle />

        <Dialog open={enhancedProjectManagementOpen} onOpenChange={setEnhancedProjectManagementOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg md:text-xl font-bold">Project Management</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEnhancedProjectManagementOpen(false)} 
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
              <UnifiedProjectManagement 
                onEditWorkflow={() => {
                  setEnhancedProjectManagementOpen(false);
                  setStructureManagerOpen(true);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        <ProjectAnalyticsWindow open={analyticsOpen} onOpenChange={setAnalyticsOpen} />
        
        <UsersSecurityWindow open={usersSecurityOpen} onOpenChange={setUsersSecurityOpen} />
        
        <ToolsMaterialsWindow open={toolsMaterialsOpen} onOpenChange={setToolsMaterialsOpen} />

        <Dialog open={homeRiskManagerOpen} onOpenChange={setHomeRiskManagerOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg md:text-xl font-bold">Home Risk Management</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setHomeRiskManagerOpen(false)} 
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
              <HomeRiskManager />
            </div>
          </DialogContent>
        </Dialog>


        <AdminRoadmapManager open={roadmapManagerOpen} onOpenChange={setRoadmapManagerOpen} />

        <AdminFeatureRequestManager open={featureRequestManagerOpen} onOpenChange={setFeatureRequestManagerOpen} />

        <AdminGuideWindow open={adminGuideOpen} onOpenChange={setAdminGuideOpen} />

        <Dialog open={processDesignOpen} onOpenChange={setProcessDesignOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg md:text-xl font-bold">Process FMEA</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setProcessDesignOpen(false)} 
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
              <PFMEAManagement />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dataRefreshOpen} onOpenChange={setDataRefreshOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg md:text-xl font-bold">Data Refresh Management</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDataRefreshOpen(false)} 
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
              <AdminDataRefresh />
            </div>
          </DialogContent>
        </Dialog>

        <AdminActionCenter open={actionCenterOpen} onOpenChange={setActionCenterOpen} />

        <AppManager open={appManagerOpen} onOpenChange={setAppManagerOpen} />

        <Dialog open={editWorkflowOpen} onOpenChange={setEditWorkflowOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <EditWorkflowView onBackToAdmin={() => setEditWorkflowOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={structureManagerOpen} onOpenChange={setStructureManagerOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg md:text-xl font-bold">Structure Manager</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStructureManagerOpen(false)} 
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
              <StructureManager onBack={() => setStructureManagerOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};