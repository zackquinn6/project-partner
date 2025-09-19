import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  GitBranch, Search, Plus, Edit, Archive, Eye, CheckCircle, Clock, 
  ArrowRight, ChevronDown, ChevronRight, AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface Project {
  id: string;
  name: string;
  description: string;
  publish_status: 'draft' | 'beta' | 'published' | 'archived';
  revision_number: number;
  parent_project_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  beta_released_at: string | null;
  archived_at: string | null;
  release_notes: string | null;
  revision_notes: string | null;
  is_current_version: boolean;
  category: string | null;
  difficulty: string | null;
  created_by: string;
}

export function UnifiedProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [projectRevisions, setProjectRevisions] = useState<Record<string, Project[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'published' | 'beta' | 'draft' | 'archived'>('published');
  
  // Dialog states
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [createRevisionDialogOpen, setCreateRevisionDialogOpen] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Project | null>(null);
  const [newStatus, setNewStatus] = useState<'beta' | 'published'>('beta');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, activeTab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectRevisions = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const parentId = project.parent_project_id || project.id;
      
      const { data: allRevisions, error } = await supabase
        .from('projects')
        .select('*')
        .or(`parent_project_id.eq.${parentId},id.eq.${parentId}`)
        .order('revision_number', { ascending: false });

      if (error) throw error;
      
      setProjectRevisions(prev => ({
        ...prev,
        [projectId]: (allRevisions || []) as Project[]
      }));
    } catch (error) {
      console.error('Error fetching project revisions:', error);
      toast({
        title: "Error",
        description: "Failed to load project revisions",
        variant: "destructive",
      });
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      if (!projectRevisions[projectId]) {
        fetchProjectRevisions(projectId);
      }
    }
    setExpandedProjects(newExpanded);
  };

  const filterProjects = () => {
    let filtered = projects.filter(project => {
      if (project.publish_status !== activeTab) return false;
      
      if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !project.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    setFilteredProjects(filtered);
  };

  const handleStatusChange = (revision: Project, status: 'beta' | 'published') => {
    setSelectedRevision(revision);
    setNewStatus(status);
    setReleaseNotes('');
    setPublishDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedRevision) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          publish_status: newStatus,
          release_notes: releaseNotes,
        })
        .eq('id', selectedRevision.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Project ${newStatus === 'beta' ? 'released to Beta' : 'published'}!`,
      });

      setPublishDialogOpen(false);
      fetchProjects();
      
      // Refresh revisions for the affected project
      const projectId = selectedRevision.parent_project_id || selectedRevision.id;
      const affectedProjects = projects.filter(p => p.id === projectId || p.parent_project_id === projectId);
      affectedProjects.forEach(p => {
        if (expandedProjects.has(p.id)) {
          fetchProjectRevisions(p.id);
        }
      });
    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const createNewRevision = async () => {
    if (!selectedProjectId) return;

    try {
      const { data, error } = await supabase.rpc('create_project_revision', {
        source_project_id: selectedProjectId,
        revision_notes_text: revisionNotes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "New draft revision created!",
      });

      setCreateRevisionDialogOpen(false);
      setRevisionNotes('');
      setSelectedProjectId(null);
      fetchProjects();
      
      // Refresh revisions for the affected project
      if (expandedProjects.has(selectedProjectId)) {
        fetchProjectRevisions(selectedProjectId);
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      toast({
        title: "Error",
        description: "Failed to create new revision",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, isCurrentVersion: boolean) => {
    const baseClasses = "font-medium";
    const currentIndicator = isCurrentVersion ? " (Current)" : "";
    
    switch (status) {
      case 'published':
        return <Badge className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Published{currentIndicator}
        </Badge>;
      case 'beta':
        return <Badge className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>
          <Eye className="w-3 h-3 mr-1" />
          Beta{currentIndicator}
        </Badge>;
      case 'draft':
        return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`}>
          <Clock className="w-3 h-3 mr-1" />
          Draft{currentIndicator}
        </Badge>;
      case 'archived':
        return <Badge className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`}>
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>;
      default:
        return <Badge variant="outline">{status}{currentIndicator}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProjectCounts = () => {
    return {
      published: projects.filter(p => p.publish_status === 'published').length,
      beta: projects.filter(p => p.publish_status === 'beta').length,
      draft: projects.filter(p => p.publish_status === 'draft').length,
      archived: projects.filter(p => p.publish_status === 'archived').length,
    };
  };

  const counts = getProjectCounts();

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Project Management & Revision Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchProjects} variant="outline">
                Refresh
              </Button>
            </div>

            {/* Status Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="published" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Published ({counts.published})
                </TabsTrigger>
                <TabsTrigger value="beta" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Beta ({counts.beta})
                </TabsTrigger>
                <TabsTrigger value="draft" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Draft ({counts.draft})
                </TabsTrigger>
                <TabsTrigger value="archived" className="flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Archived ({counts.archived})
                </TabsTrigger>
              </TabsList>

              {/* Projects List with Integrated Revision Control */}
              <div className="mt-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No {activeTab} projects found</p>
                    {searchTerm && (
                      <p className="text-sm mt-1">Try adjusting your search criteria</p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredProjects.map((project) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <Collapsible
                          open={expandedProjects.has(project.id)}
                          onOpenChange={() => toggleProjectExpansion(project.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardContent className="pt-4 cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    {expandedProjects.has(project.id) ? 
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" /> : 
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    }
                                    <h3 className="font-semibold">{project.name}</h3>
                                    {getStatusBadge(project.publish_status, project.is_current_version)}
                                    {project.revision_number > 1 && (
                                      <Badge variant="outline" className="text-xs">
                                        Rev {project.revision_number}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {project.description && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 ml-7">
                                      {project.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground ml-7">
                                    {project.category && (
                                      <span>Category: {project.category}</span>
                                    )}
                                    {project.difficulty && (
                                      <span>Difficulty: {project.difficulty}</span>
                                    )}
                                    <span>Updated: {formatDate(project.updated_at)}</span>
                                    {project.published_at && (
                                      <span>Published: {formatDate(project.published_at)}</span>
                                    )}
                                    {project.beta_released_at && (
                                      <span>Beta: {formatDate(project.beta_released_at)}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 ml-4">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProjectId(project.id);
                                      setCreateRevisionDialogOpen(true);
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    New Revision
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to edit
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <Edit className="w-3 h-3" />
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <Separator className="mb-4" />
                              <div className="pl-7">
                                <h4 className="font-medium mb-3">Revision History</h4>
                                {projectRevisions[project.id] ? (
                                  <div className="space-y-3">
                                    {projectRevisions[project.id].map((revision) => (
                                      <Card key={revision.id} className="border-l-4 border-l-primary/20">
                                        <CardContent className="pt-3">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-3 mb-2">
                                                <span className="font-medium text-sm">Rev {revision.revision_number}</span>
                                                {getStatusBadge(revision.publish_status, revision.is_current_version)}
                                              </div>
                                              
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                                                <div>Created: {formatDate(revision.created_at)}</div>
                                                {revision.beta_released_at && (
                                                  <div>Beta: {formatDate(revision.beta_released_at)}</div>
                                                )}
                                                {revision.published_at && (
                                                  <div>Published: {formatDate(revision.published_at)}</div>
                                                )}
                                              </div>

                                              {revision.revision_notes && (
                                                <p className="text-xs text-muted-foreground mb-2">
                                                  <span className="font-medium">Notes:</span> {revision.revision_notes}
                                                </p>
                                              )}

                                              {revision.release_notes && (
                                                <p className="text-xs text-muted-foreground">
                                                  <span className="font-medium">Release:</span> {revision.release_notes}
                                                </p>
                                              )}
                                            </div>

                                            <div className="flex gap-1 ml-2">
                                              {revision.publish_status === 'draft' && (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(revision, 'beta')}
                                                    className="text-xs px-2 py-1 h-auto"
                                                  >
                                                    <ArrowRight className="w-3 h-3 mr-1" />
                                                    Beta
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    onClick={() => handleStatusChange(revision, 'published')}
                                                    className="text-xs px-2 py-1 h-auto"
                                                  >
                                                    <ArrowRight className="w-3 h-3 mr-1" />
                                                    Publish
                                                  </Button>
                                                </>
                                              )}
                                              {revision.publish_status === 'beta' && (
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleStatusChange(revision, 'published')}
                                                  className="text-xs px-2 py-1 h-auto"
                                                >
                                                  <ArrowRight className="w-3 h-3 mr-1" />
                                                  Publish
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm {newStatus === 'beta' ? 'Beta Release' : 'Publication'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {newStatus === 'beta' 
                ? 'This will release the project to beta testing. Beta projects are visible to users but marked as experimental.'
                : 'This will publish the project for all users. This action will archive all previous versions.'
              }
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="release-notes">Release Notes *</Label>
              <Textarea
                id="release-notes"
                placeholder={`Describe what's new in this ${newStatus} release...`}
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmStatusChange}
                disabled={!releaseNotes.trim()}
                className={newStatus === 'published' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {newStatus === 'beta' ? 'Release to Beta' : 'Publish'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Revision Dialog */}
      <Dialog open={createRevisionDialogOpen} onOpenChange={setCreateRevisionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Revision
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a new draft revision based on the current project. The new revision will start in draft status.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="revision-notes">Revision Notes (Optional)</Label>
              <Textarea
                id="revision-notes"
                placeholder="Describe the purpose of this revision..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateRevisionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createNewRevision}>
                Create Draft Revision
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}