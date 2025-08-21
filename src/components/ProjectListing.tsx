import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Trash2, Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { ProjectSelector } from '@/components/ProjectSelector';
import ProfileManager from '@/components/ProfileManager';
import { useState } from "react";

interface ProjectListingProps {
  onProjectSelect?: (project: Project | null | 'workflow') => void;
}

export default function ProjectListing({ onProjectSelect }: ProjectListingProps) {
  const { projectRuns, currentProjectRun, setCurrentProjectRun, deleteProjectRun } = useProject();
  const navigate = useNavigate();
  const [showProfileManager, setShowProfileManager] = useState(false);

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
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const handleOpenProjectRun = (projectRun: ProjectRun) => {
    setCurrentProjectRun(projectRun);
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
              <CardTitle className="text-2xl">My Projects</CardTitle>
              <CardDescription>
                View and manage your project portfolio
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowProfileManager(true)}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                My Profile
              </Button>
              <Button 
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Start a New Project
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
                          <div className="font-semibold">{projectRun.customProjectName || projectRun.name}</div>
                          <div className="text-sm text-muted-foreground">{projectRun.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(projectRun.startDate)}</TableCell>
                      <TableCell>{formatDate(projectRun.planEndDate)}</TableCell>
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
                        {projectRun.endDate ? formatDate(projectRun.endDate) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {projectRun.status !== 'complete' && (
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
                                <AlertDialogTitle>Delete Project Run</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{projectRun.customProjectName || projectRun.name}"? This will only delete your personal project instance, not the original template.
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
    </div>
  );
}