import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Trash2, Plus, User, Wrench, Home, Users, Zap, Folder, Calculator, HelpCircle, Hammer, BookOpen, MapPin, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { ProjectSelector } from '@/components/ProjectSelector';
import ProfileManager from '@/components/ProfileManager';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { HomeManager } from '@/components/HomeManager';
import { useState } from "react";
import { CommunityPostsWindow } from '@/components/CommunityPostsWindow';
import { ManualProjectDialog } from '@/components/ManualProjectDialog';
import { ManualProjectEditDialog } from '@/components/ManualProjectEditDialog';

interface ProjectListingProps {
  onProjectSelect?: (project: Project | null | 'workflow') => void;
}

export default function ProjectListing({ onProjectSelect }: ProjectListingProps) {
  const { projectRuns, currentProjectRun, setCurrentProjectRun, deleteProjectRun } = useProject();
  const navigate = useNavigate();
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showToolsLibrary, setShowToolsLibrary] = useState(false);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [showCommunityPosts, setShowCommunityPosts] = useState(false);
  const [showManualProjectDialog, setShowManualProjectDialog] = useState(false);
  const [showManualProjectEditDialog, setShowManualProjectEditDialog] = useState(false);
  const [editingProjectRun, setEditingProjectRun] = useState<ProjectRun | null>(null);

  const calculateProgress = (projectRun: ProjectRun) => {
    return projectRun.progress || 0;
  };

  const getStatusColor = (status: ProjectRun['status']) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
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

  const handleOpenProjectRun = (projectRun: ProjectRun) => {
    console.log("🎯 ProjectListing: Opening project run:", projectRun.id);
    setCurrentProjectRun(projectRun);
    // Clear any navigation state to ensure clean transition
    window.history.replaceState({}, document.title, window.location.pathname);
    // Signal to parent that we want to switch to workflow mode for this project run
    onProjectSelect?.('workflow' as any);
  };

  const handleDeleteProjectRun = (projectRunId: string) => {
    deleteProjectRun(projectRunId);
    // Ensure we don't auto-select another project run after deletion
    setCurrentProjectRun(null);
    // Clear projectRunId from URL if this was the current one
    if (currentProjectRun?.id === projectRunId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Communicate to parent component that we want to stay in listing mode
    onProjectSelect?.(null as any);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      
      <Card className="gradient-card border-0 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">My Projects</CardTitle>
              <CardDescription className="text-sm">
                View and manage your project portfolio
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => navigate('/projects')}
                variant="default"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start a New Project
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowManualProjectDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Manual Project Log
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
              {projectRuns.length === 0 ? (
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
                projectRuns.map((projectRun) => {
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
                            <div className="font-medium">{formatDate(projectRun.endDate).monthDay}</div>
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
                              onClick={() => handleOpenProjectRun(projectRun)}
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
                                  Are you sure you want to delete "{projectRun.customProjectName || projectRun.name}"? 
                                  {projectRun.isManualEntry 
                                    ? ' This will permanently delete your manual project entry.'
                                    : ' This will only delete your personal project instance, not the original template.'
                                  }
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
          // The project runs should automatically refresh via the ProjectContext
          // since it's using real-time subscriptions or polling
          console.log('Manual project created');
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
      {/* Removed duplicate CommunityPostsWindow - handled by Navigation */}
    </div>
  );
}