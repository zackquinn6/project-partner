import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play } from "lucide-react";
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';

interface ProjectListingProps {
  onProjectSelect?: (project: Project) => void;
}

export default function ProjectListing({ onProjectSelect }: ProjectListingProps) {
  const { projects, setCurrentProject } = useProject();

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{project.name}</div>
                      <div className="text-sm text-muted-foreground">{project.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(project.startDate)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.endDate ? formatDate(project.endDate) : '-'}
                  </TableCell>
                  <TableCell>
                    {(project.status === 'open' || project.status === 'in-progress') && (
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenProject(project)}
                        className="transition-fast"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continue
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}