import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Trash2 } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';

interface ProjectListingProps {
  onProjectSelect?: (project: Project) => void;
}

export default function ProjectListing({ onProjectSelect }: ProjectListingProps) {
  const { projects, setCurrentProject, deleteProject } = useProject();

  const calculateProgress = (project: Project) => {
    const allSteps = project.phases.flatMap(phase => 
      phase.operations.flatMap(operation => operation.steps)
    );
    if (allSteps.length === 0) return 0;
    
    // For demo purposes, we'll calculate based on phase completion
    // In real implementation, you'd track completed steps
    const completedPhases = project.phases.filter(phase => 
      phase.operations.every(op => op.steps.length > 0)
    ).length;
    return allSteps.length > 0 ? (completedPhases / project.phases.length) * 100 : 0;
  };

  const getStatusFromProgress = (progress: number): Project['status'] => {
    if (progress === 0) return 'not-started';
    if (progress === 100) return 'complete';
    return 'in-progress';
  };

  const getStatusColor = (status: Project['status']) => {
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

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    onProjectSelect?.(project);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <Card className="gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">My Projects</CardTitle>
          <CardDescription>
            View and manage your project portfolio
          </CardDescription>
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
              {projects.map((project) => {
                const progress = calculateProgress(project);
                const currentStatus = getStatusFromProgress(progress);
                
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{project.name}</div>
                        <div className="text-sm text-muted-foreground">{project.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(project.startDate)}</TableCell>
                    <TableCell>{formatDate(project.planEndDate)}</TableCell>
                    <TableCell className="w-32">
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground text-center">
                          {Math.round(progress)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(currentStatus)}>
                        {currentStatus.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.endDate ? formatDate(project.endDate) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {currentStatus !== 'complete' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenProject(project)}
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
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}