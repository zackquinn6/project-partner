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
import {
  Settings,
  BarChart3,
  Shield,
  Wrench,
  AlertTriangle,
  Bell,
  FileText,
  MapPin,
  Grid3x3,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
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

type AdminLauncherItem = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: LucideIcon;
  onOpen: () => void;
  requireFullAdmin: boolean;
  comingSoon?: boolean;
};

function AdminAppIconTile({
  item,
  onActivate,
}: {
  item: AdminLauncherItem;
  onActivate: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={item.title}
      className={`group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        item.comingSoon
          ? 'border-dashed border-muted-foreground/40 bg-muted/20 hover:bg-muted/35'
          : 'border-border/70 bg-card hover:border-primary/35 hover:bg-muted/30'
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="flex min-h-10 flex-col items-center justify-center gap-1">
        <span className="text-xs font-medium leading-snug text-foreground sm:text-sm">{item.title}</span>
        {item.comingSoon ? (
          <Badge variant="secondary" className="text-[10px] font-normal">
            Coming soon
          </Badge>
        ) : null}
      </div>
    </button>
  );
}

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
  const [processMapOpen, setProcessMapOpen] = useState(false);
  const [roadmapManagerOpen, setRoadmapManagerOpen] = useState(false);
  const [featureRequestManagerOpen, setFeatureRequestManagerOpen] = useState(false);
  const [adminGuideOpen, setAdminGuideOpen] = useState(false);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [appManagerOpen, setAppManagerOpen] = useState(false);
  const [projectSkillAssessmentsOpen, setProjectSkillAssessmentsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'admin' | 'process-map'>('admin');

  useEffect(() => {
    if (isProjectOwnerOnly) {
      setEnhancedProjectManagementOpen(true);
    }
  }, [isProjectOwnerOnly]);

  if (currentView === 'process-map') {
    return <StructureManager onBack={() => setCurrentView('admin')} />;
  }

  const launcherItems: AdminLauncherItem[] = [
    {
      id: 'action-center',
      requireFullAdmin: true,
      title: 'Action Center',
      description: 'Review user feedback that still needs admin attention',
      actionLabel: 'Open Action Center',
      icon: Bell,
      onOpen: () => setActionCenterOpen(true),
    },
    {
      id: 'project-management',
      requireFullAdmin: false,
      title: 'Project Management',
      description: 'Unified project management with integrated revision control',
      actionLabel: 'Open Project Management',
      icon: Settings,
      onOpen: () => setEnhancedProjectManagementOpen(true),
    },
    {
      id: 'analytics',
      requireFullAdmin: false,
      title: 'Project Analytics',
      description: 'View project metrics, completion rates, and performance data',
      actionLabel: 'Open Analytics',
      icon: BarChart3,
      onOpen: () => setAnalyticsOpen(true),
    },
    {
      id: 'users-security',
      requireFullAdmin: true,
      title: 'Users & Security',
      description: 'Manage user roles, permissions, agreements, and monitor security',
      actionLabel: 'Users & Security',
      icon: Shield,
      onOpen: () => setUsersSecurityOpen(true),
    },
    {
      id: 'tools-materials',
      requireFullAdmin: true,
      title: 'Tools & Materials',
      description: 'Manage reusable tools and materials for projects',
      actionLabel: 'Open Library',
      icon: Wrench,
      onOpen: () => setToolsMaterialsOpen(true),
    },
    {
      id: 'home-risks',
      requireFullAdmin: true,
      title: 'Home Risks',
      description: 'Manage construction risks based on home build years',
      actionLabel: 'Home Risks',
      icon: AlertTriangle,
      onOpen: () => setHomeRiskManagerOpen(true),
    },
    {
      id: 'roadmap',
      requireFullAdmin: true,
      title: 'Roadmap',
      description: 'Manage feature roadmap items and user feature requests',
      actionLabel: 'Roadmap Management',
      icon: MapPin,
      onOpen: () => setRoadmapManagerOpen(true),
    },
    {
      id: 'app-manager',
      requireFullAdmin: true,
      title: 'App Manager',
      description: 'Manage all apps: native apps, external apps, and workspace apps',
      actionLabel: 'App Manager',
      icon: Grid3x3,
      onOpen: () => setAppManagerOpen(true),
    },
    {
      id: 'skill-assessments',
      requireFullAdmin: true,
      title: 'Project Skill Assessments',
      description: 'Configure per–project-type skill checks and view how users rate themselves',
      actionLabel: 'Learn more',
      icon: GraduationCap,
      onOpen: () => setProjectSkillAssessmentsOpen(true),
      comingSoon: true,
    },
  ];

  const visibleLaunchers = launcherItems.filter(
    (item) => !item.requireFullAdmin || !isProjectOwnerOnly
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-4 text-center md:text-left">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-4xl font-bold text-primary">Administration Panel</h1>
            <Button variant="outline" size="sm" onClick={() => setAdminGuideOpen(true)} className="text-xs shrink-0">
              <FileText className="mr-2 h-4 w-4" />
              Admin Guide
            </Button>
          </div>
          <p className="text-lg text-muted-foreground">Manage projects, analytics, and user permissions</p>
        </div>

        <div>
          <h2 className="mb-4 hidden text-sm font-semibold uppercase tracking-wide text-muted-foreground md:block">
            Apps
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:hidden">
            {visibleLaunchers.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  className={`flex cursor-pointer flex-col transition-shadow hover:shadow-lg ${
                    item.comingSoon ? 'border-dashed' : ''
                  }`}
                  onClick={item.onOpen}
                >
                  <CardHeader className="flex-1 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                    </div>
                    <CardTitle className="flex flex-col items-center gap-2">
                      <span>{item.title}</span>
                      {item.comingSoon ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          Coming soon
                        </Badge>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="flex min-h-[3rem] items-center justify-center">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button
                      className="w-full"
                      variant={item.comingSoon ? 'outline' : 'default'}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onOpen();
                      }}
                    >
                      {item.actionLabel}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="hidden grid-cols-4 gap-4 lg:grid-cols-5 md:grid">
            {visibleLaunchers.map((item) => (
              <AdminAppIconTile key={item.id} item={item} onActivate={item.onOpen} />
            ))}
          </div>
        </div>

        {!isProjectOwnerOnly && (
          <section className="flex flex-col gap-6 md:gap-0 md:overflow-hidden md:rounded-xl md:border md:bg-card">
            <div className="hidden border-b bg-muted/30 px-6 py-4 md:block">
              <h2 className="text-lg font-semibold tracking-tight">Admin tools</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Site-wide switches, partner apps, landing defaults, and public site options
              </p>
            </div>
            <div className="flex flex-col gap-6 md:divide-y md:divide-border">
              <div className="md:px-6 md:py-5 md:[&>div]:rounded-none md:[&>div]:border-0 md:[&>div]:shadow-none">
                <BetaModeToggle />
              </div>
              <div className="md:px-6 md:py-5 md:[&>div]:rounded-none md:[&>div]:border-0 md:[&>div]:shadow-none">
                <PartnerAppToggles />
              </div>
              <div className="md:px-6 md:py-5 md:[&>div]:rounded-none md:[&>div]:border-0 md:[&>div]:shadow-none">
                <DefaultLandingSetting />
              </div>
              <div className="md:px-6 md:py-5 md:[&>div]:rounded-none md:[&>div]:border-0 md:[&>div]:shadow-none">
                <PublicSiteSettingsCard />
              </div>
            </div>
          </section>
        )}

        <Dialog open={enhancedProjectManagementOpen} onOpenChange={setEnhancedProjectManagementOpen}>
          <DialogContent className="fixed inset-0 w-full h-[100dvh] max-w-none max-h-none md:max-w-none md:max-h-none translate-x-0 translate-y-0 rounded-none md:rounded-none border-0 p-0 overflow-hidden flex flex-col shadow-none [&>button]:hidden">
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
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 md:px-4 py-3 md:py-4">
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
          <DialogContent className="relative fixed inset-0 z-50 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none overflow-hidden md:max-w-none md:max-h-none md:rounded-none [&>button]:hidden">
            <EditWorkflowView onBackToAdmin={() => setEditWorkflowOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={processMapOpen} onOpenChange={setProcessMapOpen}>
          <DialogContent className="w-full h-screen max-w-full max-h-full md:max-w-[90vw] md:h-[90vh] md:rounded-lg p-0 overflow-hidden flex flex-col [&>button]:hidden">
            <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-lg md:text-xl font-bold">Process Map</DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setProcessMapOpen(false)} 
                  className="h-7 px-2 text-[9px] md:text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
              <StructureManager onBack={() => setProcessMapOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};