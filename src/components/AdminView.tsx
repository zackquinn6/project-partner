import React, { useState } from 'react';
import { ProjectManagementWindow } from '@/components/ProjectManagementWindow';
import { ProjectAnalyticsWindow } from '@/components/ProjectAnalyticsWindow';
import { UsersSecurityWindow } from '@/components/UsersSecurityWindow';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { KnowledgeIngestionSystem } from '@/components/KnowledgeIngestionSystem';
import { HomeRiskManager } from '@/components/HomeRiskManager';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, BarChart3, Shield, Wrench, Lock, Brain, TrendingUp, Users, Cog, Scroll, MapPin, FileText, AlertTriangle } from 'lucide-react';
import { StructureManager } from './StructureManager';
import { AdminRoadmapManager } from './AdminRoadmapManager';
import { AdminFeatureRequestManager } from './AdminFeatureRequestManager';
import { AppDescriptionDialog } from './AppDescriptionDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AdminView: React.FC = () => {
  const [projectManagementOpen, setProjectManagementOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [usersSecurityOpen, setUsersSecurityOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [knowledgeSystemOpen, setKnowledgeSystemOpen] = useState(false);
  const [homeRiskManagerOpen, setHomeRiskManagerOpen] = useState(false);
  
  const [processDesignOpen, setProcessDesignOpen] = useState(false);
  const [roadmapManagerOpen, setRoadmapManagerOpen] = useState(false);
  const [featureRequestManagerOpen, setFeatureRequestManagerOpen] = useState(false);
  const [appDescriptionOpen, setAppDescriptionOpen] = useState(false);
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
              <CardTitle>Process Design</CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Process design and failure modes & effects analysis management
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button className="w-full" onClick={() => setProcessDesignOpen(true)}>
                Process Design
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Design</DialogTitle>
            </DialogHeader>
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Cog className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Process Design and Process Failure Modes & Effects Analysis (PFMEA) management feature in development
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
                <p className="text-sm text-blue-800">
                  This feature will help you design robust processes and identify potential failure modes before they occur, ensuring higher quality project outcomes.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};