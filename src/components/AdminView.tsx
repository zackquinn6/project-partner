import React, { useState, useEffect } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useProjectOwner } from '@/hooks/useProjectOwner';
import { UnifiedProjectManagement } from '@/components/UnifiedProjectManagement';
import { ProjectAnalyticsWindow } from '@/components/ProjectAnalyticsWindow';
import { UsersSecurityWindow } from '@/components/UsersSecurityWindow';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { HomeRiskManager } from '@/components/HomeRiskManager';
import { AdminActionCenter } from '@/components/AdminActionCenter';
import EditWorkflowView from '@/components/EditWorkflowView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, BarChart3, Shield, Wrench, AlertTriangle, RefreshCw, Bell, FileText, MapPin, Cog, RefreshCcw, Edit, Grid3x3, Sparkles, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StructureManager } from './StructureManager';
import { AdminRoadmapManager } from './AdminRoadmapManager';
import { AdminFeatureRequestManager } from './AdminFeatureRequestManager';
import { AdminGuideWindow } from './AdminGuideWindow';
import { BetaModeToggle } from './BetaModeToggle';
import { PartnerAppToggles } from './PartnerAppToggles';
import { PublicSiteSettingsCard } from '@/components/admin/PublicSiteSettingsCard';
import { AppManager } from './AppManager';
import { Card as SettingCard, CardHeader as SettingCardHeader, CardTitle as SettingCardTitle, CardDescription as SettingCardDescription, CardContent as SettingCardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label as SettingLabel } from '@/components/ui/label';

type DefaultLandingMode = 'projects' | 'workspace';

const DefaultLandingSetting: React.FC = () => {
  const [mode, setMode] = useState<DefaultLandingMode>('projects');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'default_landing_view')
          .maybeSingle();

        if (error) {
          console.error('Error loading default landing view setting:', error);
          return;
        }

        const value = (data?.setting_value as { mode?: DefaultLandingMode } | null)?.mode;
        if (value === 'projects' || value === 'workspace') {
          setMode(value);
        }
      } catch (err) {
        console.error('Unexpected error loading default landing view setting:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = async (value: DefaultLandingMode) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            setting_key: 'default_landing_view',
            setting_value: { mode: value },
            updated_at: new Date().toISOString()
          },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;

      setMode(value);
      toast.success(
        value === 'projects'
          ? 'Default landing set to Project Catalog'
          : 'Default landing set to Workspace home'
      );
    } catch (err) {
      console.error('Error updating default landing view setting:', err);
      toast.error('Failed to update default landing view');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingCard>
      <SettingCardHeader>
        <SettingCardTitle>Default landing view</SettingCardTitle>
        <SettingCardDescription>
          Choose where users land after signing in when there is no specific project context.
        </SettingCardDescription>
      </SettingCardHeader>
      <SettingCardContent>
        <RadioGroup
          value={mode}
          onValueChange={(val) => handleChange(val as DefaultLandingMode)}
          className="flex flex-col gap-3 md:flex-row md:gap-6"
          disabled={loading || saving}
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="projects" id="landing-projects" />
            <SettingLabel htmlFor="landing-projects" className="space-y-1 cursor-pointer">
              <div className="font-medium">Project Catalog</div>
              <p className="text-sm text-muted-foreground">
                Open the project catalog by default so users can pick a project template.
              </p>
            </SettingLabel>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="workspace" id="landing-workspace" />
            <SettingLabel htmlFor="landing-workspace" className="space-y-1 cursor-pointer">
              <div className="font-medium">Workspace home</div>
              <p className="text-sm text-muted-foreground">
                Open the main workspace home screen instead of the project catalog.
              </p>
            </SettingLabel>
          </div>
        </RadioGroup>
      </SettingCardContent>
    </SettingCard>
  );
};
export const AdminView: React.FC = () => {
  const { isAdmin } = useUserRole();
  const { hasProjectOwnerRole } = useProjectOwner();
  const isProjectOwnerOnly = hasProjectOwnerRole && !isAdmin;

  const [enhancedProjectManagementOpen, setEnhancedProjectManagementOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [usersSecurityOpen, setUsersSecurityOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [homeRiskManagerOpen, setHomeRiskManagerOpen] = useState(false);
  const [editWorkflowOpen, setEditWorkflowOpen] = useState(false);
  const [structureManagerOpen, setStructureManagerOpen] = useState(false);
  const [roadmapManagerOpen, setRoadmapManagerOpen] = useState(false);
  const [featureRequestManagerOpen, setFeatureRequestManagerOpen] = useState(false);
  const [adminGuideOpen, setAdminGuideOpen] = useState(false);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [appManagerOpen, setAppManagerOpen] = useState(false);
  const [projectSkillAssessmentsOpen, setProjectSkillAssessmentsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'admin' | 'structure-manager'>('admin');

  useEffect(() => {
    if (isProjectOwnerOnly) {
      setEnhancedProjectManagementOpen(true);
    }
  }, [isProjectOwnerOnly]);

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
          {!isProjectOwnerOnly && (
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
          )}

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

          {!isProjectOwnerOnly && (
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
          )}

          {!isProjectOwnerOnly && (
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
          )}

          {!isProjectOwnerOnly && (
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
          )}

          {!isProjectOwnerOnly && (
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
          )}

          {!isProjectOwnerOnly && (
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
          )}

          {!isProjectOwnerOnly && (
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col border-dashed"
            onClick={() => setProjectSkillAssessmentsOpen(true)}
          >
            <CardHeader className="text-center flex-1">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="flex flex-col items-center gap-2">
                <span>Project Skill Assessments</span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Coming soon
                </Badge>
              </CardTitle>
              <CardDescription className="min-h-[3rem] flex items-center justify-center">
                Configure per–project-type skill checks and view how users rate themselves
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setProjectSkillAssessmentsOpen(true)}
              >
                Learn more
              </Button>
            </CardContent>
          </Card>
          )}

        </div>

        {!isProjectOwnerOnly && (
          <>
            {/* Beta Mode Toggle */}
            <BetaModeToggle />

            {/* Partner apps & Expert support toggles */}
            <PartnerAppToggles />

            {/* Default landing view setting */}
            <DefaultLandingSetting />

            <PublicSiteSettingsCard />
          </>
        )}

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
                  // Keep project management open, just open workflow editor
                  setEditWorkflowOpen(true);
                }}
                onOpenAnalytics={() => {
                  setEnhancedProjectManagementOpen(false);
                  setAnalyticsOpen(true);
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

        <AdminActionCenter open={actionCenterOpen} onOpenChange={setActionCenterOpen} />

        <AppManager open={appManagerOpen} onOpenChange={setAppManagerOpen} />

        <Dialog open={projectSkillAssessmentsOpen} onOpenChange={setProjectSkillAssessmentsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                Project Skill Assessments
                <Badge variant="secondary">Coming soon</Badge>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Planned admin tools for project-specific user skill assessments.
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For each project type, you will be able to create assessments for users to determine their
              skill levels—including experience, formal training, and technical knowledge. User responses
              will map to beginner, intermediate, or advanced tiers per project template and will be stored
              on their profile (in addition to their general DIY skill level). Until then, the product
              defaults everyone to beginner for each project type.
            </p>
            <Button className="w-full" type="button" onClick={() => setProjectSkillAssessmentsOpen(false)}>
              Close
            </Button>
          </DialogContent>
        </Dialog>

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