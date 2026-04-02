import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Trash2, Plus, User, Wrench, Home, Users, Zap, Folder, Calculator, HelpCircle, Hammer, BookOpen, MapPin, Edit, Camera, Bell, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { ProjectSelector } from '@/components/ProjectSelector';
import ProfileManager from '@/components/ProfileManager';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { HomeManager } from '@/components/HomeManager';
import { useState, useCallback } from "react";
import { useButtonTracker } from '@/hooks/useButtonTracker';
import { useGlobalPublicSettings } from '@/hooks/useGlobalPublicSettings';
import { CommunityPostsWindow } from '@/components/CommunityPostsWindow';
import { ManualProjectDialog } from '@/components/ManualProjectDialog';
import { ManualProjectEditDialog } from '@/components/ManualProjectEditDialog';
import { calculateProjectProgress } from '@/utils/progressCalculation';
import {
  dashboardStatusBadgeClassName,
  dashboardStatusBadgeLabel,
  dashboardStatusFromProgressPercent,
} from '@/utils/projectDashboardStatus';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ProjectPortfolioRemindersDialog } from '@/components/ProjectPortfolioRemindersDialog';
import { getRiskFocusAwareDisplayName, isRiskFocusRun } from '@/utils/projectRunRiskFocus';
import { useMembership } from '@/contexts/MembershipContext';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { AfterActionReviewWindow } from '@/components/AfterActionReviewWindow';
import { useAfterActionReviewRunIds } from '@/hooks/useAfterActionReviewRunIds';

interface ProjectListingProps {
  onProjectSelect?: (project: Project | null | 'workflow') => void;
}

export default function ProjectListing({ onProjectSelect }: ProjectListingProps) {
  const { projectRuns, currentProjectRun, setCurrentProjectRun, deleteProjectRun, fetchProjectRuns } = useProject();
  const { trackClick } = useButtonTracker();
  const { projectCatalogEnabled } = useGlobalPublicSettings();
  const { hasProjectsTier, hasRiskLessTier, loading: membershipLoading } = useMembership();
  const navigate = useNavigate();
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showToolsLibrary, setShowToolsLibrary] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [showCommunityPosts, setShowCommunityPosts] = useState(false);
  const [showManualProjectDialog, setShowManualProjectDialog] = useState(false);
  const [showManualProjectEditDialog, setShowManualProjectEditDialog] = useState(false);
  const [editingProjectRun, setEditingProjectRun] = useState<ProjectRun | null>(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showPortfolioReminders, setShowPortfolioReminders] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('Projects membership');
  const [aarWindowOpen, setAarWindowOpen] = useState(false);
  const [aarTargetRun, setAarTargetRun] = useState<ProjectRun | null>(null);
  const aarRunIds = useAfterActionReviewRunIds(projectRuns);

  const goToCatalog = () => {
    if (!membershipLoading && !hasProjectsTier) {
      setUpgradeFeature('Projects membership');
      setShowUpgradePrompt(true);
      return;
    }
    navigate('/projects');
  };

  const shouldShowAarEntry = (projectRun: ProjectRun, progressPercent: number) => {
    const dashStatus = dashboardStatusFromProgressPercent(progressPercent);
    return dashStatus === 'complete' || aarRunIds.has(projectRun.id);
  };

  const calculateProgress = (projectRun: ProjectRun) => {
    try {
      return calculateProjectProgress(projectRun);
    } catch (error) {
      console.error('Failed to calculate project progress:', error);
      return 0;
    }
  };

  const formatDate = (date: Date) => {
    const formatted = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
    
    // Split into month/day and year
    const parts = formatted.split(', ');
    return {
      monthDay: parts[0],
      year: parts[1] || ''
    };
  };

  const handleOpenProjectRun = useCallback((projectRun: ProjectRun) => {
    console.log("🎯 Opening project run:", projectRun.name);

    if (!projectRun.isManualEntry) {
      if (isRiskFocusRun(projectRun)) {
        if (!membershipLoading && !hasRiskLessTier) {
          setUpgradeFeature('Risk-Less');
          setShowUpgradePrompt(true);
          return;
        }
      } else if (!membershipLoading && !hasProjectsTier) {
        setUpgradeFeature('Projects membership');
        setShowUpgradePrompt(true);
        return;
      }
    }

    if (isRiskFocusRun(projectRun)) {
      window.dispatchEvent(
        new CustomEvent('open-risk-focus-register-for-run', {
          detail: { projectRunId: projectRun.id },
        })
      );
      return;
    }
    
    // CRITICAL FIX: Clear reset flags immediately BEFORE setting project run
    // This prevents UserView useEffect from forcing listing mode
    window.dispatchEvent(new CustomEvent('clear-reset-flags'));
    
    // CRITICAL: Navigate with projectRunId in state so UserView can properly load it
    // This ensures UserView's useEffect that watches projectRunId will trigger
    navigate('/', {
      state: {
        view: 'user',
        projectRunId: projectRun.id
      },
      replace: true
    });
    
    // Set project run in context
    setCurrentProjectRun(projectRun);
    onProjectSelect?.('workflow' as any);
    
    console.log("🎯 Project run navigation completed:", projectRun.name);
  }, [
    setCurrentProjectRun,
    onProjectSelect,
    navigate,
    hasProjectsTier,
    hasRiskLessTier,
    membershipLoading,
  ]);

  const handleDeleteProjectRun = async (projectRunId: string) => {
    // Always clear projectRunId from location state so UserView does not open
    // another project (or kickoff) after delete. Stay on Project Dashboard listing.
    navigate(window.location.pathname, {
      replace: true,
      state: { view: 'user' }
    });

    setCurrentProjectRun(null);

    await deleteProjectRun(projectRunId);

    onProjectSelect?.(null as any);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Mobile Close Button */}
      <div className="md:hidden flex justify-end mb-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onProjectSelect?.(null)}
          className="text-sm"
        >
          Close
        </Button>
      </div>
      
      <Card className="gradient-card border-0 shadow-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Project Dashboard
              </CardTitle>
              <CardDescription className="text-sm">
                Manage your projects
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => setShowPortfolioReminders(true)}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
              <Button 
                onClick={() => setShowPhotoGallery(true)}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Camera className="w-4 h-4 mr-2" />
                Photos
              </Button>
              {projectCatalogEnabled && (
              <Button 
                onClick={goToCatalog}
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Start New Project</span>
                <span className="sm:hidden">New Project</span>
              </Button>
              )}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowManualProjectDialog(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Log Project</span>
                <span className="sm:hidden">Log Project</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: Stack layout */}
          <div className="md:hidden space-y-4">
            {projectRuns.filter(run => run.status !== 'cancelled').length === 0 ? (
              <div className="h-24 flex flex-col items-center justify-center space-y-2 text-center">
                <p className="text-muted-foreground">No projects yet.</p>
                {projectCatalogEnabled && (
                <Button 
                  onClick={goToCatalog}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Your First Project
                </Button>
                )}
              </div>
            ) : (
              projectRuns
                .filter(run => run.status !== 'cancelled')
                .map((projectRun) => {
                const progress = calculateProgress(projectRun);
                const dashStatus = dashboardStatusFromProgressPercent(progress);
                const aarVisible = shouldShowAarEntry(projectRun, progress);
                return (
                  <Card key={projectRun.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 flex flex-col gap-1">
                          {isRiskFocusRun(projectRun) && (
                            <Badge variant="outline" className="text-xs w-fit">
                              Risk-Less
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{getRiskFocusAwareDisplayName(projectRun)}</h3>
                            {projectRun.isManualEntry && (
                              <Badge variant="secondary" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={dashboardStatusBadgeClassName(dashStatus)}>
                          {dashboardStatusBadgeLabel(dashStatus)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground text-center">
                          {Math.round(progress)}% complete
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground/80">Start</span>{' '}
                          {formatDate(projectRun.startDate).monthDay}
                        </div>
                        <div>
                          <span className="font-medium text-foreground/80">Plan End</span>{' '}
                          {formatDate(projectRun.planEndDate).monthDay}
                        </div>
                        {projectRun.endDate ? (
                          <div>
                            <span className="font-medium text-foreground/80">Actual End</span>{' '}
                            {formatDate(projectRun.endDate).monthDay}
                          </div>
                        ) : null}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        {projectRun.isManualEntry && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingProjectRun(projectRun);
                              setShowManualProjectEditDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {dashStatus !== 'complete' && !projectRun.isManualEntry && (
                          <Button 
                            size="sm" 
                            onClick={trackClick(`continue-${projectRun.id}`, () => handleOpenProjectRun(projectRun), {
                              preventBubbling: true
                            })}
                            className="flex-1"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Continue
                          </Button>
                        )}

                        {aarVisible && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAarTargetRun(projectRun);
                              setAarWindowOpen(true);
                            }}
                            className="shrink-0"
                            title="After Action Review"
                          >
                            <ClipboardList className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">AAR</span>
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project {projectRun.isManualEntry ? 'Entry' : 'Run'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this project?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProjectRun(projectRun.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Plan End</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actual End</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {projectRuns.filter(run => run.status !== 'cancelled').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-muted-foreground">No projects yet.</p>
                      {projectCatalogEnabled && (
                      <Button 
                        onClick={goToCatalog}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Start Your First Project
                      </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projectRuns
                  .filter(run => run.status !== 'cancelled')
                  .map((projectRun) => {
                  const progress = calculateProgress(projectRun);
                  const dashStatus = dashboardStatusFromProgressPercent(progress);
                  const aarVisible = shouldShowAarEntry(projectRun, progress);

                  return (
                    <TableRow key={projectRun.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          {isRiskFocusRun(projectRun) && (
                            <Badge variant="outline" className="text-xs w-fit">
                              Risk-Less
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getRiskFocusAwareDisplayName(projectRun)}</span>
                            {projectRun.isManualEntry && (
                              <Badge variant="secondary" className="text-xs">
                                User-uploaded
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs leading-tight">
                          <div className="font-medium">{formatDate(projectRun.startDate).monthDay}</div>
                          <div className="text-muted-foreground">{formatDate(projectRun.startDate).year}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs leading-tight">
                          <div className="font-medium">{formatDate(projectRun.planEndDate).monthDay}</div>
                          <div className="text-muted-foreground">{formatDate(projectRun.planEndDate).year}</div>
                        </div>
                      </TableCell>
                      <TableCell className="w-32">
                        <div className="space-y-1">
                          <Progress value={progress} className="h-2" />
                          <div className="text-xs text-muted-foreground text-center">
                            {Math.round(progress)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={dashboardStatusBadgeClassName(dashStatus)}>
                          {dashboardStatusBadgeLabel(dashStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {projectRun.endDate ? (
                          <div className="text-xs leading-tight">
                            <div className="font-medium text-green-700">{formatDate(projectRun.endDate).monthDay}</div>
                            <div className="text-muted-foreground">{formatDate(projectRun.endDate).year}</div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">-</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Edit button for manual projects only */}
                          {projectRun.isManualEntry && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setEditingProjectRun(projectRun);
                                setShowManualProjectEditDialog(true);
                              }}
                              className="transition-fast"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {dashStatus !== 'complete' && !projectRun.isManualEntry && (
                            <Button 
                              size="sm" 
                              onClick={trackClick(`continue-desktop-${projectRun.id}`, () => handleOpenProjectRun(projectRun), {
                                preventBubbling: true
                              })}
                              className="transition-fast"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Continue
                            </Button>
                          )}

                          {aarVisible && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="transition-fast"
                              title="After Action Review"
                              onClick={() => {
                                setAarTargetRun(projectRun);
                                setAarWindowOpen(true);
                              }}
                            >
                              <ClipboardList className="w-4 h-4 mr-1" />
                              AAR
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="transition-fast">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Project {projectRun.isManualEntry ? 'Entry' : 'Run'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this project?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProjectRun(projectRun.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <ProfileManager
        open={showProfileManager} 
        onOpenChange={setShowProfileManager} 
      />
      <ToolsMaterialsWindow 
        open={showToolsLibrary} 
        onOpenChange={setShowToolsLibrary} 
      />
      <HomeManager 
        open={showHomeManager} 
        onOpenChange={setShowHomeManager} 
      />
      <ManualProjectDialog
        open={showManualProjectDialog}
        onOpenChange={setShowManualProjectDialog}
        onProjectCreated={() => {
          fetchProjectRuns();
        }}
      />
      <ManualProjectEditDialog
        open={showManualProjectEditDialog}
        onOpenChange={(open) => {
          setShowManualProjectEditDialog(open);
          if (!open) {
            setEditingProjectRun(null);
          }
        }}
        projectRun={editingProjectRun}
        onProjectUpdated={() => {
          console.log('Manual project updated');
          // Project runs will refresh automatically
        }}
      />
      <ProjectPortfolioRemindersDialog
        open={showPortfolioReminders}
        onOpenChange={setShowPortfolioReminders}
      />
      <PhotoGallery
        open={showPhotoGallery}
        onOpenChange={setShowPhotoGallery}
        mode="user"
        title="All Project Photos"
      />
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        feature={upgradeFeature}
      />
      <AfterActionReviewWindow
        open={aarWindowOpen}
        onOpenChange={(open) => {
          setAarWindowOpen(open);
          if (!open) setAarTargetRun(null);
        }}
        projectRun={aarTargetRun}
      />
      {/* Removed duplicate CommunityPostsWindow - handled by Navigation */}
    </div>
  );
}