import React, { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, RotateCcw, Calendar, User, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface RevisionHistoryWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectRevision {
  id: string;
  name: string;
  revisionNumber: number;
  parentProjectId: string;
  revisionNotes: string;
  createdFromRevision: number;
  createdAt: Date;
  updatedAt: Date;
  publishStatus: 'draft' | 'published' | 'beta-testing' | 'archived';
  author?: string;
  changesSummary?: string;
}

export const RevisionHistoryWindow: React.FC<RevisionHistoryWindowProps> = ({
  open,
  onOpenChange
}) => {
  const { currentProject, projects, updateProject } = useProject();
  const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');

  useEffect(() => {
    if (open && currentProject) {
      fetchRevisions();
    }
  }, [open, currentProject]);

  const fetchRevisions = () => {
    if (!currentProject) return;
    
    setLoading(true);
    
    // Find all projects in the same revision family
    const rootProjectId = currentProject.parentProjectId || currentProject.id;
    const projectRevisions = projects
      .filter(project => 
        project.id === rootProjectId || 
        project.parentProjectId === rootProjectId
      )
      .map(project => ({
        id: project.id,
        name: project.name,
        revisionNumber: project.revisionNumber || 1,
        parentProjectId: project.parentProjectId || project.id,
        revisionNotes: project.revisionNotes || '',
        createdFromRevision: project.createdFromRevision || 1,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        publishStatus: project.publishStatus,
        author: 'Admin', // TODO: Get actual author from auth context
        changesSummary: project.revisionNotes || 'No changes noted'
      }))
      .sort((a, b) => b.revisionNumber - a.revisionNumber);
    
    setRevisions(projectRevisions);
    setLoading(false);
  };

  const handleRestoreRevision = async () => {
    if (!selectedRevisionId || !currentProject) {
      toast.error('Please select a revision to restore');
      return;
    }

    const revisionToRestore = projects.find(p => p.id === selectedRevisionId);
    if (!revisionToRestore) {
      toast.error('Revision not found');
      return;
    }

    try {
      // Create a new revision from the selected one
      const newRevision: Project = {
        ...revisionToRestore,
        id: `${Date.now()}`, // Generate new ID
        name: `${revisionToRestore.name}`,
        parentProjectId: currentProject.parentProjectId || currentProject.id,
        revisionNumber: (currentProject.revisionNumber || 1) + 1,
        revisionNotes: `Restored from revision ${revisionToRestore.revisionNumber}`,
        createdFromRevision: revisionToRestore.revisionNumber || 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishStatus: 'draft' as const
      };

      await updateProject(newRevision);
      // Revision restored successfully - no toast needed
      onOpenChange(false);
    } catch (error) {
      console.error('Error restoring revision:', error);
      toast.error('Failed to restore revision');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'beta-testing': return 'secondary';
      case 'draft': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-center py-8">Loading revision history...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Revision History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Restore Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Restore Revision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select value={selectedRevisionId} onValueChange={setSelectedRevisionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a revision to restore..." />
                    </SelectTrigger>
                    <SelectContent>
                      {revisions.map((revision) => (
                        <SelectItem key={revision.id} value={revision.id}>
                          Rev {revision.revisionNumber}: {revision.name}
                          {revision.id === currentProject?.id && ' (Current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleRestoreRevision}
                  disabled={!selectedRevisionId || selectedRevisionId === currentProject?.id}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Restoring will create a new revision based on the selected version.
              </p>
            </CardContent>
          </Card>

          {/* Project Management Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    // Navigate to edit workflow - this would need to be passed as a prop
                  }}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Edit className="w-4 h-4" />
                  Edit Workflow
                </Button>
                <Button 
                  onClick={() => {
                    // Handle release to beta
                    toast("Project marked for beta testing");
                  }}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Calendar className="w-4 h-4" />
                  Release to Beta
                </Button>
                <Button 
                  onClick={() => {
                    // Handle release to production
                    toast("Project released to production");
                  }}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <User className="w-4 h-4" />
                  Release to Production
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use these actions to edit the project workflow or manage release status.
              </p>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Revision History ({revisions.length} versions)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rev #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Updated Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map((revision) => (
                    <TableRow 
                      key={revision.id}
                      className={revision.id === currentProject?.id ? 'bg-muted/50' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          Rev {revision.revisionNumber}
                          {revision.id === currentProject?.id && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-sm truncate">{revision.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusColor(revision.publishStatus) as any}
                          className="capitalize"
                        >
                          {revision.publishStatus.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {revision.changesSummary || 'No changes noted'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3" />
                          {revision.author || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {new Date(revision.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(revision.updatedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};