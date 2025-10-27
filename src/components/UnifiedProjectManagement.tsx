import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  GitBranch, Plus, Edit, Archive, Eye, CheckCircle, Clock, 
  ArrowRight, AlertTriangle, Settings, Save, X, RefreshCw, Lock, Trash2, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useButtonTracker } from '@/hooks/useButtonTracker';
import { ProjectOwnershipSelector } from '@/components/ProjectOwnershipSelector';

// Alphabetically sorted project categories
const PROJECT_CATEGORIES = [
  'Appliances',
  'Bathroom',
  'Ceilings',
  'Decks & Patios',
  'Doors & Windows',
  'Electrical',
  'Exterior Carpentry',
  'Flooring',
  'General Repairs & Maintenance',
  'HVAC & Ventilation',
  'Insulation & Weatherproofing',
  'Interior Carpentry',
  'Kitchen',
  'Landscaping & Outdoor Projects',
  'Lighting & Electrical',
  'Masonry & Concrete',
  'Painting & Finishing',
  'Plumbing',
  'Roofing',
  'Safety & Security',
  'Smart Home & Technology',
  'Storage & Organization',
  'Tile',
  'Walls & Drywall',
];

interface Project {
  id: string;
  name: string;
  description: string;
  publish_status: 'draft' | 'beta-testing' | 'published' | 'archived';
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
  category: string[] | null;
  effort_level: string | null;
  skill_level: string | null;
  estimated_time: string | null;
  scaling_unit: string | null;
  diy_length_challenges: string | null;
  created_by: string;
  owner_id: string | null;
  phases?: any; // JSON field for phases
  images?: string[]; // Array of image URLs
  cover_image?: string | null; // URL of cover image
}

export function UnifiedProjectManagement() {
  const navigate = useNavigate();
  const { setCurrentProject } = useProject();
  const { trackClick } = useButtonTracker();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectRevisions, setProjectRevisions] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [activeView, setActiveView] = useState<'details' | 'revisions'>('details');
  
  // Dialog states
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [createRevisionDialogOpen, setCreateRevisionDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Project | null>(null);
  const [newStatus, setNewStatus] = useState<'beta-testing' | 'published'>('beta-testing');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [newProject, setNewProject] = useState<{
    name: string;
    description: string;
    categories: string[];
    effort_level: string;
    skill_level: string;
    estimated_time: string;
    scaling_unit: string;
  }>({
    name: '',
    description: '',
    categories: [],
    effort_level: 'Medium',
    skill_level: 'Intermediate',
    estimated_time: '',
    scaling_unit: '',
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectRevisions();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('parent_project_id', null)
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

  const fetchProjectRevisions = async () => {
    if (!selectedProject) return;
    
    try {
      const parentId = selectedProject.parent_project_id || selectedProject.id;
      
      const { data: allRevisions, error } = await supabase
        .from('projects')
        .select('*')
        .or(`parent_project_id.eq.${parentId},id.eq.${parentId}`)
        .order('revision_number', { ascending: false });

      if (error) throw error;
      setProjectRevisions((allRevisions || []) as Project[]);
    } catch (error) {
      console.error('Error fetching project revisions:', error);
      toast({
        title: "Error",
        description: "Failed to load project revisions",
        variant: "destructive",
      });
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project || null);
    setEditingProject(false);
    setEditedProject({});
  };

  const startProjectEdit = () => {
    if (selectedProject) {
      // Ensure category is an array when starting edit
      setEditedProject({ 
        ...selectedProject,
        category: selectedProject.category || []
      });
      setEditingProject(true);
    }
  };

  const saveProjectEdit = async () => {
    if (!selectedProject || !editedProject) return;

    try {
      // Only send editable database columns (not computed or joined fields)
      const updateData: any = {
        name: editedProject.name || selectedProject.name,
        description: editedProject.description !== undefined ? editedProject.description : selectedProject.description,
        category: editedProject.category || [],
        effort_level: editedProject.effort_level !== undefined ? editedProject.effort_level : selectedProject.effort_level,
        skill_level: editedProject.skill_level !== undefined ? editedProject.skill_level : selectedProject.skill_level,
        estimated_time: editedProject.estimated_time !== undefined ? editedProject.estimated_time : selectedProject.estimated_time,
        scaling_unit: editedProject.scaling_unit !== undefined ? editedProject.scaling_unit : selectedProject.scaling_unit,
        diy_length_challenges: editedProject.diy_length_challenges !== undefined ? editedProject.diy_length_challenges : selectedProject.diy_length_challenges,
        images: editedProject.images !== undefined ? editedProject.images : selectedProject.images,
        cover_image: editedProject.cover_image !== undefined ? editedProject.cover_image : selectedProject.cover_image,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 Saving project edit:', {
        projectId: selectedProject.id,
        fields: Object.keys(updateData),
        changes: updateData
      });

      const { error, data } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', selectedProject.id)
        .select();

      if (error) {
        console.error('❌ Save error:', error);
        throw error;
      }

      console.log('✅ Project saved successfully:', data);
      toast({
        title: "Success",
        description: "Project updated successfully!",
      });

      setEditingProject(false);
      setEditedProject({});
      
      // Refresh projects to show updated data
      await fetchProjects();
      
      // Update selectedProject with new data
      if (data && data[0]) {
        setSelectedProject(data[0] as Project);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  };

  const cancelProjectEdit = () => {
    setEditingProject(false);
    setEditedProject({});
  };

  const handleStatusChange = (revision: Project, status: 'beta-testing' | 'published') => {
    console.log('🎯 handleStatusChange called:', { revision: revision.id, status });
    setSelectedRevision(revision);
    setNewStatus(status);
    setReleaseNotes('');
    setPublishDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    console.log('🎯 confirmStatusChange called:', { 
      hasRevision: !!selectedRevision, 
      revisionId: selectedRevision?.id,
      newStatus, 
      releaseNotes 
    });
    
    if (!selectedRevision) {
      console.error('❌ No selected revision');
      return;
    }

    if (!releaseNotes.trim()) {
      console.error('❌ No release notes provided');
      toast({
        title: "Error",
        description: "Release notes are required",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🚀 Updating project status...');
      const { error } = await supabase
        .from('projects')
        .update({
          publish_status: newStatus,
          release_notes: releaseNotes,
        })
        .eq('id', selectedRevision.id);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Project status updated successfully');
      toast({
        title: "Success",
        description: `Project ${newStatus === 'beta-testing' ? 'released to Beta' : 'published'}!`,
      });

      setPublishDialogOpen(false);
      setReleaseNotes('');
      fetchProjects();
      if (selectedProject) {
        fetchProjectRevisions();
      }
    } catch (error) {
      console.error('❌ Error updating project status:', error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    }
  };

  const createNewRevision = async () => {
    if (!selectedProject) return;

    try {
      const { data, error } = await supabase.rpc('create_project_revision', {
        source_project_id: selectedProject.id,
        revision_notes_text: revisionNotes || null,
      });

      if (error) throw error;

      setCreateRevisionDialogOpen(false);
      setRevisionNotes('');
      fetchProjects();
      fetchProjectRevisions();
    } catch (error) {
      console.error('Error creating revision:', error);
      toast({
        title: "Error",
        description: "Failed to create new revision",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will delete all revisions and cannot be undone.')) {
      return;
    }

    try {
      // Delete all revisions first
      const { error: revisionsError } = await supabase
        .from('projects')
        .delete()
        .or(`id.eq.${projectId},parent_project_id.eq.${projectId}`);

      if (revisionsError) throw revisionsError;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const deleteDraftRevision = async (revisionId: string, revisionNumber: number) => {
    if (revisionNumber === 0) {
      toast({
        title: "Error",
        description: "Cannot delete the base revision (revision 0)",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete this draft revision? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', revisionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft revision deleted successfully",
      });

      fetchProjects();
      fetchProjectRevisions();
    } catch (error) {
      console.error('Error deleting revision:', error);
      toast({
        title: "Error",
        description: "Failed to delete revision",
        variant: "destructive",
      });
    }
  };

  const handleEditStandardProject = async () => {
    try {
      // Fetch standard project using RPC
      const { data: standardData, error: rpcError } = await supabase
        .rpc('get_standard_project_template');
      
      if (rpcError) throw rpcError;
      if (!standardData || standardData.length === 0) throw new Error('Standard Project not found');
      
      const projectData = standardData[0];
      const parsedPhases = Array.isArray(projectData.phases) ? projectData.phases : 
        (typeof projectData.phases === 'string' ? JSON.parse(projectData.phases) : []);
        
      setCurrentProject({
        id: projectData.project_id,
        name: projectData.project_name,
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(),
        planEndDate: new Date(),
        status: 'not-started' as const,
        publishStatus: 'draft' as const,
        phases: parsedPhases,
      isStandardTemplate: true
      });
      
      // Navigate to edit workflow view using Index.tsx view state management
      navigate('/', { state: { view: 'editWorkflow' } });
    } catch (error) {
      console.error('Error loading standard project:', error);
      toast({
        title: "Error",
        description: "Failed to load Standard Project Foundation",
        variant: "destructive",
      });
    }
  };

  const createProject = async () => {
    try {
      // Use new backend function to create project with standard foundation
      const { data, error } = await supabase
        .rpc('create_project_with_standard_foundation', {
          p_project_name: newProject.name,
          p_description: newProject.description || null,
          p_categories: newProject.categories.length > 0 ? newProject.categories : null,
          p_difficulty: null,
          p_effort_level: newProject.effort_level || 'Medium',
          p_skill_level: newProject.skill_level || 'Intermediate',
          p_estimated_time: newProject.estimated_time || null,
          p_scaling_unit: newProject.scaling_unit || null,
          p_diy_length_challenges: null,
          p_image: null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "New project created with standard phases!",
      });

      setCreateProjectDialogOpen(false);
      setNewProject({
        name: '',
        description: '',
        categories: [],
        effort_level: 'Medium',
        skill_level: 'Intermediate',
        estimated_time: '',
        scaling_unit: '',
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
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

  return (
    <>
      <div className="space-y-6 h-full flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Project Management & Revision Control
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={handleEditStandardProject}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Edit Standard
                </Button>
                <Button onClick={fetchProjects} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 enhanced-scroll">
            {/* Project Selector */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="project-select">Select Project</Label>
                <Select value={selectedProject?.id || ''} onValueChange={handleProjectSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project to manage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects
                      .filter(project => 
                        project.id !== '00000000-0000-0000-0000-000000000000' && // Hide manual log template
                        project.id !== '00000000-0000-0000-0000-000000000001'    // Hide Standard Project Foundation
                      )
                      .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <span>{project.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setCreateProjectDialogOpen(true)} className="flex items-center gap-2 self-end">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>

            {selectedProject && (
              <div className="space-y-6">
                {/* Project Details Section */}
                <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Project Details</TabsTrigger>
                    <TabsTrigger value="revisions">Revision Control</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Project Information</CardTitle>
                          <div className="flex gap-2">
                            {editingProject ? (
                              <>
                                <Button onClick={saveProjectEdit} size="icon" variant="outline">
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button onClick={cancelProjectEdit} variant="outline" size="icon">
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button onClick={startProjectEdit} className="flex items-center gap-1">
                                  <Edit className="w-4 h-4" />
                                  Edit Project
                                </Button>
                                <Button 
                                  onClick={() => handleDeleteProject(selectedProject.id)} 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Project Name</Label>
                            {editingProject ? (
                              <Input
                                value={editedProject.name || ''}
                                onChange={(e) => setEditedProject(prev => ({ ...prev, name: e.target.value }))}
                                className="text-sm"
                              />
                            ) : (
                              <div className="p-2 bg-muted rounded text-sm">{selectedProject.name}</div>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-sm">Status</Label>
                            <div className="p-2 text-sm">
                              {(() => {
                                if (!projectRevisions || projectRevisions.length === 0) return 'No revisions';
                                const latestRevision = projectRevisions.find(r => r.is_current_version) || projectRevisions[0];
                                const statusText = latestRevision.publish_status === 'published' ? 'Production' : 
                                                 latestRevision.publish_status === 'beta-testing' ? 'Beta' : 
                                                 latestRevision.publish_status === 'draft' ? 'Draft' : 'Archived';
                                return `Revision ${latestRevision.revision_number} - ${statusText}`;
                              })()}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Categories</Label>
                            {editingProject ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-between text-sm h-auto min-h-[40px] py-2">
                                    <span className="text-left">
                                      {editedProject.category && editedProject.category.length > 0
                                        ? editedProject.category.join(', ')
                                        : 'Select categories...'}
                                    </span>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0 bg-background" align="start">
                                  <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                                    {PROJECT_CATEGORIES.map((cat) => (
                                      <div key={cat} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`edit-cat-${cat}`}
                                          checked={editedProject.category?.includes(cat) || false}
                                          onCheckedChange={(checked) => {
                                            const currentCategories = editedProject.category || [];
                                            const newCategories = checked
                                              ? [...currentCategories, cat]
                                              : currentCategories.filter(c => c !== cat);
                                            setEditedProject(prev => ({ ...prev, category: newCategories }));
                                          }}
                                        />
                                        <label htmlFor={`edit-cat-${cat}`} className="text-sm cursor-pointer">
                                          {cat}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <div className="p-2 bg-muted rounded text-sm">
                                {selectedProject.category && selectedProject.category.length > 0
                                  ? selectedProject.category.join(', ')
                                  : 'Not specified'}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Effort Level</Label>
                            {editingProject ? (
                              <Select
                                value={editedProject.effort_level || ''}
                                onValueChange={(value) => setEditedProject(prev => ({ ...prev, effort_level: value }))}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Low">Low</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="p-2 bg-muted rounded capitalize text-sm">{selectedProject.effort_level || 'Not specified'}</div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Skill Level</Label>
                            {editingProject ? (
                              <Select
                                value={editedProject.skill_level || ''}
                                onValueChange={(value) => setEditedProject(prev => ({ ...prev, skill_level: value }))}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Beginner">Beginner</SelectItem>
                                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                                  <SelectItem value="Advanced">Advanced</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="p-2 bg-muted rounded capitalize text-sm">{selectedProject.skill_level || 'Not specified'}</div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Estimated Time</Label>
                            {editingProject ? (
                              <Input
                                value={editedProject.estimated_time || ''}
                                onChange={(e) => setEditedProject(prev => ({ ...prev, estimated_time: e.target.value }))}
                                className="text-sm"
                              />
                            ) : (
                              <div className="p-2 bg-muted rounded text-sm">{selectedProject.estimated_time || 'Not specified'}</div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm">Scaling Unit</Label>
                            {editingProject ? (
                              <Select
                                value={editedProject.scaling_unit || ''}
                                onValueChange={(value) => setEditedProject(prev => ({ ...prev, scaling_unit: value }))}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select scaling unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="per square foot">per square foot</SelectItem>
                                  <SelectItem value="per 10x10 room">per 10x10 room</SelectItem>
                                  <SelectItem value="per linear foot">per linear foot</SelectItem>
                                  <SelectItem value="per cubic yard">per cubic yard</SelectItem>
                                  <SelectItem value="per item">per item</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="p-2 bg-muted rounded text-sm">{selectedProject.scaling_unit || 'Not specified'}</div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Description</Label>
                          {editingProject ? (
                            <Textarea
                              value={editedProject.description || ''}
                              onChange={(e) => setEditedProject(prev => ({ ...prev, description: e.target.value }))}
                              rows={3}
                              className="text-sm"
                            />
                          ) : (
                            <div className="p-2 bg-muted rounded min-h-[60px] text-sm">
                              {selectedProject.description || 'No description provided'}
                            </div>
                          )}
                        </div>

                         <div className="space-y-1">
                           <Label className="text-sm">DIY Challenges</Label>
                           {editingProject ? (
                             <Textarea
                               value={editedProject.diy_length_challenges || ''}
                               onChange={(e) => setEditedProject(prev => ({ ...prev, diy_length_challenges: e.target.value }))}
                               rows={3}
                               className="text-sm"
                               placeholder="Describe any DIY challenges or considerations..."
                             />
                           ) : (
                             <div className="p-2 bg-muted rounded min-h-[60px] text-sm">
                               {selectedProject.diy_length_challenges || 'No DIY challenges specified'}
                             </div>
                           )}
                         </div>

                         {/* Project Ownership Section */}
                         <Separator className="my-4" />
                         <ProjectOwnershipSelector
                           projectId={selectedProject.id}
                           currentOwnerId={selectedProject.owner_id}
                           onOwnerChange={(ownerId) => setSelectedProject(prev => prev ? {...prev, owner_id: ownerId} : null)}
                           disabled={editingProject}
                         />

                          {/* Image Management Section */}
                         <div className="space-y-3">
                           <Label className="text-sm">Project Images</Label>
                           {editingProject ? (
                             <div className="space-y-3">
                               {/* Image Upload */}
                               <div className="flex gap-2">
                                 <Input
                                   type="url"
                                   placeholder="Enter image URL"
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter' && e.currentTarget.value) {
                                       const newImages = [...(editedProject.images || []), e.currentTarget.value];
                                       setEditedProject(prev => ({ ...prev, images: newImages }));
                                       e.currentTarget.value = '';
                                     }
                                   }}
                                   className="text-sm"
                                 />
                                 <Button
                                   type="button"
                                   variant="outline"
                                   size="sm"
                                   onClick={(e) => {
                                     const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                     if (input && input.value) {
                                       const newImages = [...(editedProject.images || []), input.value];
                                       setEditedProject(prev => ({ ...prev, images: newImages }));
                                       input.value = '';
                                     }
                                   }}
                                 >
                                   Add
                                 </Button>
                               </div>
                               
                               {/* Display Images */}
                               {(editedProject.images || []).length > 0 && (
                                 <div className="grid grid-cols-3 gap-2">
                                   {(editedProject.images || []).map((img, idx) => (
                                     <div key={idx} className="relative group">
                                       <img 
                                         src={img} 
                                         alt={`Project ${idx + 1}`}
                                         className="w-full h-24 object-cover rounded border"
                                       />
                                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                                         <Button
                                           type="button"
                                           size="sm"
                                           variant="secondary"
                                           onClick={() => {
                                             setEditedProject(prev => ({ ...prev, cover_image: img }));
                                           }}
                                         >
                                           {editedProject.cover_image === img ? '✓ Cover' : 'Set Cover'}
                                         </Button>
                                         <Button
                                           type="button"
                                           size="sm"
                                           variant="destructive"
                                           onClick={() => {
                                             const newImages = (editedProject.images || []).filter((_, i) => i !== idx);
                                             setEditedProject(prev => ({ ...prev, images: newImages }));
                                             if (editedProject.cover_image === img) {
                                               setEditedProject(prev => ({ ...prev, cover_image: null }));
                                             }
                                           }}
                                         >
                                           Delete
                                         </Button>
                                       </div>
                                       {editedProject.cover_image === img && (
                                         <Badge className="absolute top-1 left-1 bg-primary text-xs">Cover</Badge>
                                       )}
                                     </div>
                                   ))}
                                 </div>
                               )}
                             </div>
                           ) : (
                             <div>
                               {(selectedProject.images || []).length > 0 ? (
                                 <div className="grid grid-cols-4 gap-2">
                                   {(selectedProject.images || []).map((img, idx) => (
                                     <div key={idx} className="relative">
                                       <img 
                                         src={img} 
                                         alt={`Project ${idx + 1}`}
                                         className="w-full h-24 object-cover rounded border"
                                       />
                                       {selectedProject.cover_image === img && (
                                         <Badge className="absolute top-1 left-1 bg-primary text-xs">Cover</Badge>
                                       )}
                                     </div>
                                   ))}
                                 </div>
                               ) : (
                                 <div className="p-2 bg-muted rounded text-sm text-muted-foreground">No images uploaded</div>
                               )}
                             </div>
                           )}
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Created:</span> {formatDate(selectedProject.created_at)}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span> {formatDate(selectedProject.updated_at)}
                          </div>
                          {selectedProject.published_at && (
                            <div>
                              <span className="font-medium">Published:</span> {formatDate(selectedProject.published_at)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="revisions" className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Revision Control</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setCreateRevisionDialogOpen(true)}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <GitBranch className="w-4 h-4" />
                              Create Revision
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {projectRevisions.map((revision) => (
                              <Card key={revision.id} className="border-l-4 border-l-primary/20">
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-medium">Revision {revision.revision_number}</h4>
                                        {getStatusBadge(revision.publish_status, revision.is_current_version)}
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                                        <div>
                                          <span className="font-medium">Created:</span> {formatDate(revision.created_at)}
                                        </div>
                                        {revision.beta_released_at && (
                                          <div>
                                            <span className="font-medium">Beta Release:</span> {formatDate(revision.beta_released_at)}
                                          </div>
                                        )}
                                        {revision.published_at && (
                                          <div>
                                            <span className="font-medium">Published:</span> {formatDate(revision.published_at)}
                                          </div>
                                        )}
                                        {revision.archived_at && (
                                          <div>
                                            <span className="font-medium">Archived:</span> {formatDate(revision.archived_at)}
                                          </div>
                                        )}
                                      </div>

                                      {revision.revision_notes && (
                                        <div className="mb-2">
                                          <span className="font-medium text-sm">Revision Notes:</span>
                                          <p className="text-sm text-muted-foreground mt-1">{revision.revision_notes}</p>
                                        </div>
                                      )}

                                      {revision.release_notes && (
                                        <div>
                                          <span className="font-medium text-sm">Release Notes:</span>
                                          <p className="text-sm text-muted-foreground mt-1">{revision.release_notes}</p>
                                        </div>
                                      )}
                                    </div>

                                     <div className="flex flex-col gap-2 ml-4">
                      {revision.publish_status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Set the current project and navigate to edit workflow
                            let parsedPhases = [];
                            try {
                              // Handle phases - might be string or already parsed
                              let phases = revision.phases;
                              if (typeof phases === 'string') {
                                phases = JSON.parse(phases);
                              }
                              // Check for double-encoding
                              if (typeof phases === 'string') {
                                console.warn('Phases double-encoded in UnifiedProjectManagement');
                                phases = JSON.parse(phases);
                              }
                              parsedPhases = phases || [];
                              
                              console.log('Setting current project for edit:', {
                                revisionId: revision.id,
                                revisionNumber: revision.revision_number,
                                phaseCount: Array.isArray(parsedPhases) ? parsedPhases.length : 0,
                                firstPhase: parsedPhases[0]?.name,
                                firstPhaseOps: parsedPhases[0]?.operations?.length
                              });
                            } catch (e) {
                              console.error('Failed to parse phases for revision:', revision.id, e);
                              parsedPhases = [];
                            }
                            
                            setCurrentProject({ 
                              id: revision.id, 
                              name: revision.name,
                              description: revision.description || '',
                              createdAt: new Date(revision.created_at),
                              updatedAt: new Date(revision.updated_at),
                              startDate: new Date(),
                              planEndDate: new Date(),
                              status: 'not-started' as const,
                              publishStatus: revision.publish_status as 'draft' | 'published' | 'beta-testing',
                              phases: parsedPhases
                            });
                            navigate('/', { state: { view: 'editWorkflow' } });
                          }}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit Workflow
                        </Button>
                      )}
                                      {revision.publish_status === 'draft' && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              console.log('🎯 Beta button clicked');
                                              handleStatusChange(revision, 'beta-testing');
                                            }}
                                            className="flex items-center gap-1"
                                          >
                                            <ArrowRight className="w-3 h-3" />
                                            Release to Beta
                                          </Button>
                                           <Button
                                             size="sm"
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                               console.log('🎯 Production button clicked');
                                               handleStatusChange(revision, 'published');
                                             }}
                                             className="flex items-center gap-1"
                                           >
                                             <ArrowRight className="w-3 h-3" />
                                             Release to Production
                                           </Button>
                                           {revision.revision_number > 0 && (
                                             <Button
                                               size="sm"
                                               variant="destructive"
                                               onClick={() => deleteDraftRevision(revision.id, revision.revision_number)}
                                               className="flex items-center gap-1"
                                             >
                                               <X className="w-3 h-3" />
                                               Delete Draft
                                             </Button>
                                           )}
                                        </>
                                      )}
                                      {revision.publish_status === 'beta-testing' && (
                                         <Button
                                           size="sm"
                                           onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             console.log('🎯 Promote to Production button clicked');
                                             handleStatusChange(revision, 'published');
                                           }}
                                           className="flex items-center gap-1"
                                         >
                                           <ArrowRight className="w-3 h-3" />
                                           Release to Production
                                         </Button>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {!selectedProject && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
                <p>Select a project from the dropdown above to view and edit its details, or create a new project.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm {newStatus === 'beta-testing' ? 'Beta Release' : 'Publication'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {newStatus === 'beta-testing' 
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎯 Confirm button clicked in dialog');
                  confirmStatusChange();
                }}
                disabled={!releaseNotes.trim()}
                className={newStatus === 'published' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {newStatus === 'beta-testing' ? 'Release to Beta' : 'Publish'}
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
              <GitBranch className="w-5 h-5" />
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

      {/* Create Project Dialog */}
      <Dialog open={createProjectDialogOpen} onOpenChange={setCreateProjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="Enter project name..."
                value={newProject.name || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Describe the project..."
                value={newProject.description || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-categories">Categories</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-auto min-h-[40px] py-2">
                      <span className="text-left text-sm">
                        {newProject.categories.length > 0
                          ? newProject.categories.join(', ')
                          : 'Select categories...'}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-background" align="start">
                    <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                      {PROJECT_CATEGORIES.map((cat) => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-cat-${cat}`}
                            checked={newProject.categories.includes(cat)}
                            onCheckedChange={(checked) => {
                              const newCategories = checked
                                ? [...newProject.categories, cat]
                                : newProject.categories.filter(c => c !== cat);
                              setNewProject(prev => ({ ...prev, categories: newCategories }));
                            }}
                          />
                          <label htmlFor={`new-cat-${cat}`} className="text-sm cursor-pointer">
                            {cat}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-effort">Effort Level</Label>
                <Select
                  value={newProject.effort_level || 'Medium'}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, effort_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-skill">Skill Level</Label>
                <Select
                  value={newProject.skill_level || 'Intermediate'}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, skill_level: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-time">Estimated Time</Label>
                <Input
                  id="project-time"
                  placeholder="e.g., 2-4 hours"
                  value={newProject.estimated_time || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, estimated_time: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-scaling">Scaling Unit</Label>
                <Select
                  value={newProject.scaling_unit || ''}
                  onValueChange={(value) => setNewProject(prev => ({ ...prev, scaling_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scaling unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per square foot">per square foot</SelectItem>
                    <SelectItem value="per 10x10 room">per 10x10 room</SelectItem>
                    <SelectItem value="per linear foot">per linear foot</SelectItem>
                    <SelectItem value="per cubic yard">per cubic yard</SelectItem>
                    <SelectItem value="per item">per item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateProjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createProject} disabled={!newProject.name?.trim()}>
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}