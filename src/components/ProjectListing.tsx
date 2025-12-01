import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Trash2, Plus, User, Wrench, Home, Users, Zap, Folder, Calculator, HelpCircle, Hammer, BookOpen, MapPin, Edit, Camera } from "lucide-react";
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
import { CommunityPostsWindow } from '@/components/CommunityPostsWindow';
import { ManualProjectDialog } from '@/components/ManualProjectDialog';
import { ManualProjectEditDialog } from '@/components/ManualProjectEditDialog';
import { calculateProjectProgress } from '@/utils/progressCalculation';
import { PhotoGallery } from '@/components/PhotoGallery';

interface ProjectListingProps {
  onProjectSelect?: (project: Project | null | 'workflow') => void;
}

export default function ProjectListing({ onProjectSelect }: ProjectListingProps) {
  const { projectRuns, currentProjectRun, setCurrentProjectRun, deleteProjectRun, fetchProjectRuns } = useProject();
  const { trackClick } = useButtonTracker();
  const navigate = useNavigate();
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showToolsLibrary, setShowToolsLibrary] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [showCommunityPosts, setShowCommunityPosts] = useState(false);
  const [showManualProjectDialog, setShowManualProjectDialog] = useState(false);
  const [showManualProjectEditDialog, setShowManualProjectEditDialog] = useState(false);
  const [editingProjectRun, setEditingProjectRun] = useState<ProjectRun | null>(null);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  const calculateProgress = (projectRun: ProjectRun) => {
    return calculateProjectProgress(projectRun);
  };

  const getStatusColor = (status: ProjectRun['status']) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    
    // CRITICAL FIX: Clear reset flags immediately BEFORE setting project run
    // This prevents UserView useEffect from forcing listing mode
    window.dispatchEvent(new CustomEvent('clear-reset-flags'));
    
    // SYNCHRONOUS navigation - no setTimeout delays
    setCurrentProjectRun(projectRun);
    window.history.replaceState({}, document.title, window.location.pathname);
    onProjectSelect?.('workflow' as any);
    
    console.log("🎯 Project run navigation completed:", projectRun.name);
  }, [setCurrentProjectRun, onProjectSelect]);

  const handleDeleteProjectRun = (projectRunId: string) => {
    deleteProjectRun(projectRunId);
    // Ensure we don't auto-select another project run after deletion
    setCurrentProjectRun(null);
    // Clear projectRunId from location state to prevent UserView from trying to load it
    if (currentProjectRun?.id === projectRunId) {
      // Clear location state projectRunId by navigating without it
      navigate(window.location.pathname, { 
        replace: true,
        state: { view: 'user' } // Keep view but remove projectRunId
      });
    }
    // Communicate to parent component that we want to stay in listing mode
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
              <CardTitle className="text-xl">Progress Board</CardTitle>
              <CardDescription className="text-sm">
                View and manage your project portfolio
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Button 
                onClick={() => setShowPhotoGallery(true)}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Camera className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">View All Photos</span>
                <span className="sm:hidden">Photos</span>
              </Button>
              <Button 
                onClick={() => navigate('/projects')}
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Start a New Project</span>
                <span className="sm:hidden">New Project</span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowManualProjectDialog(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Manual Project Log</span>
                <span className="sm:hidden">Manual Log</span>
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
                <Button 
                  onClick={() => navigate('/projects')}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start Your First Project
                </Button>
              </div>
            ) : (
              projectRuns
                .filter(run => run.status !== 'cancelled')
                .map((projectRun) => {
                const progress = calculateProgress(projectRun);
                return (
                  <Card key={projectRun.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{projectRun.customProjectName || projectRun.name}</h3>
                            {projectRun.isManualEntry && (
                              <Badge variant="secondary" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{projectRun.description}</p>
                        </div>
                        <Badge className={getStatusColor(projectRun.status)}>
                          {projectRun.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground text-center">
                          {Math.round(progress)}% complete
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <div>Started: {formatDate(projectRun.startDate).monthDay}</div>
                        <div>Due: {formatDate(projectRun.planEndDate).monthDay}</div>
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
                        
                        {projectRun.status !== 'complete' && !projectRun.isManualEntry && (
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
                  <TableHead>Start Date</TableHead>
                  <TableHead>Plan End Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actual End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {projectRuns.filter(run => run.status !== 'cancelled').length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="text-muted-foreground">No projects yet.</p>
                      <Button 
                        onClick={() => navigate('/projects')}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Start Your First Project
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                projectRuns
                  .filter(run => run.status !== 'cancelled')
                  .map((projectRun) => {
                  const progress = calculateProgress(projectRun);
                  
                  return (
                    <TableRow key={projectRun.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{projectRun.customProjectName || projectRun.name}</span>
                            {projectRun.isManualEntry && (
                              <Badge variant="secondary" className="text-xs">
                                User-uploaded
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{projectRun.description}</div>
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
                        <Badge className={getStatusColor(projectRun.status)}>
                          {projectRun.status.replace('-', ' ')}
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
                          
                          {projectRun.status !== 'complete' && !projectRun.isManualEntry && (
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
      <PhotoGallery
        open={showPhotoGallery}
        onOpenChange={setShowPhotoGallery}
        mode="user"
        title="All Project Photos"
      />
      {/* Removed duplicate CommunityPostsWindow - handled by Navigation */}
    </div>
  );
}