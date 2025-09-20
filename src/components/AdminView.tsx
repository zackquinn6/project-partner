import React, { useState } from 'react';
import { UnifiedProjectManagement } from '@/components/UnifiedProjectManagement';
import { ProjectAnalyticsWindow } from '@/components/ProjectAnalyticsWindow';
import { UsersSecurityWindow } from '@/components/UsersSecurityWindow';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { KnowledgeIngestionSystem } from '@/components/KnowledgeIngestionSystem';
import { HomeRiskManager } from '@/components/HomeRiskManager';
import { AdminSecurityDashboard } from '@/components/AdminSecurityDashboard';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, BarChart3, Shield, Wrench, Lock, Brain, TrendingUp, Users, Cog, Scroll, MapPin, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { StructureManager } from './StructureManager';
import { AdminRoadmapManager } from './AdminRoadmapManager';
import { AdminFeatureRequestManager } from './AdminFeatureRequestManager';
import { AdminDataRefresh } from './AdminDataRefresh';
import { AppDescriptionDialog } from './AppDescriptionDialog';
import { PFMEAManagement } from './PFMEAManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AdminView: React.FC = () => {
  const [enhancedProjectManagementOpen, setEnhancedProjectManagementOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [usersSecurityOpen, setUsersSecurityOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [knowledgeSystemOpen, setKnowledgeSystemOpen] = useState(false);
  const [homeRiskManagerOpen, setHomeRiskManagerOpen] = useState(false);
  const [securityDashboardOpen, setSecurityDashboardOpen] = useState(false);
  
  const [processDesignOpen, setProcessDesignOpen] = useState(false);
  const [roadmapManagerOpen, setRoadmapManagerOpen] = useState(false);
  const [featureRequestManagerOpen, setFeatureRequestManagerOpen] = useState(false);
  const [appDescriptionOpen, setAppDescriptionOpen] = useState(false);
  const [dataRefreshOpen, setDataRefreshOpen] = useState(false);
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAppDescriptionOpen(true)}
              className="text-xs"
            >
              <FileText className="w-4 h-4 mr-2" />
              App Guide
            </Button>
          </div>
          <p className="text-lg text-muted-foreground">Manage projects, analytics, and user permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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


          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col" onClick={() => setKnowledgeSystemOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Knowledge System</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                AI knowledge ingestion and project guidance improvements
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setKnowledgeSystemOpen(true)}>
                Knowledge System
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

          <Card className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col border-red-200 bg-red-50" onClick={() => setSecurityDashboardOpen(true)}>
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-800">Security Dashboard</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center text-red-700">
                Enhanced security monitoring with data masking and audit logging
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => setSecurityDashboardOpen(true)}>
                Security Center
              </Button>
            </CardContent>
          </Card>
        </div>

        <Dialog open={enhancedProjectManagementOpen} onOpenChange={setEnhancedProjectManagementOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
             <DialogTitle>Project Management & Revision Control</DialogTitle>
           </DialogHeader>
           <UnifiedProjectManagement />
          </DialogContent>
        </Dialog>

        <ProjectAnalyticsWindow 
          open={analyticsOpen} 
          onOpenChange={setAnalyticsOpen} 
        />
        
        <UsersSecurityWindow 
          open={usersSecurityOpen} 
          onOpenChange={setUsersSecurityOpen} 
        />
        
        <ToolsMaterialsWindow 
          open={toolsMaterialsOpen} 
          onOpenChange={setToolsMaterialsOpen} 
        />

        <Dialog open={knowledgeSystemOpen} onOpenChange={setKnowledgeSystemOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Knowledge Ingestion System</DialogTitle>
            </DialogHeader>
            <KnowledgeIngestionSystem />
          </DialogContent>
        </Dialog>

        <Dialog open={homeRiskManagerOpen} onOpenChange={setHomeRiskManagerOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Home Risk Management</DialogTitle>
            </DialogHeader>
            <HomeRiskManager />
          </DialogContent>
        </Dialog>


        <AdminRoadmapManager
          open={roadmapManagerOpen}
          onOpenChange={setRoadmapManagerOpen}
        />

        <AdminFeatureRequestManager
          open={featureRequestManagerOpen}
          onOpenChange={setFeatureRequestManagerOpen}
        />

        <AppDescriptionDialog
          open={appDescriptionOpen}
          onOpenChange={setAppDescriptionOpen}
        />

        <Dialog open={processDesignOpen} onOpenChange={setProcessDesignOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Failure Mode and Effects Analysis (PFMEA)</DialogTitle>
            </DialogHeader>
            <PFMEAManagement />
          </DialogContent>
        </Dialog>

        <Dialog open={dataRefreshOpen} onOpenChange={setDataRefreshOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Internet Data Refresh Management</DialogTitle>
            </DialogHeader>
            <AdminDataRefresh />
          </DialogContent>
        </Dialog>

        <Dialog open={securityDashboardOpen} onOpenChange={setSecurityDashboardOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-red-800 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Enhanced Security Dashboard
              </DialogTitle>
            </DialogHeader>
            <AdminSecurityDashboard />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};