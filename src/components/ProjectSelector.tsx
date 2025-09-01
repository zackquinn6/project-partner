import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FolderOpen, Edit, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HomeManager } from '@/components/HomeManager';

interface ProjectSelectorProps {
  isAdminMode?: boolean;
  onProjectSelected?: () => void;
  onEditProjectDetails?: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ isAdminMode = false, onProjectSelected, onEditProjectDetails }) => {
  const { projects, currentProject, setCurrentProject, addProject, updateProject, deleteProject } = useProject();
  const { user } = useAuth();
  
  // Debug logging
  console.log('ProjectSelector - projects count:', projects.length, 'isAdminMode:', isAdminMode);
  console.log('Projects available:', projects.map(p => ({ name: p.name, publishStatus: p.publishStatus })));
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: ''
  });
  const [projectSetupForm, setProjectSetupForm] = useState({
    projectLeader: '',
    teamMate: '',
    targetEndDate: '',
    selectedHomeId: ''
  });
  const [homes, setHomes] = useState<any[]>([]);
  const [showHomeManager, setShowHomeManager] = useState(false);

  const handleCreateProject = () => {
    if (!newProjectForm.name.trim()) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectForm.name,
      description: newProjectForm.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'not-started' as const,
      publishStatus: 'draft' as const,
      phases: []
    };

    addProject(newProject);
    setCurrentProject(newProject);
    setNewProjectForm({ name: '', description: '' });
    setIsNewProjectOpen(false);
    // Only open setup dialog in user mode, not admin mode
    if (!isAdminMode) {
      setIsProjectSetupOpen(true);
    }
  };

  const handleProjectSelect = (project: Project) => {
    console.log('handleProjectSelect called with project:', project.name, 'ID:', project.id);
    console.log('Current project:', currentProject?.name, 'ID:', currentProject?.id);
    
    if (project && project.id !== currentProject?.id) {
      setCurrentProject(project);
      // Only open setup dialog in user mode, not admin mode
      if (!isAdminMode) {
        fetchHomes(); // Fetch homes when setup dialog opens
        setIsProjectSetupOpen(true);
      }
    }
  };

  const handleProjectSelect2 = (value: string) => {
    // Don't auto-select if value is empty (happens when current project is deleted)
    if (!value) return;
    
    const project = projects.find(p => p.id === value);
    if (project && project.id !== currentProject?.id) {
      setCurrentProject(project);
      // Only open setup dialog in user mode, not admin mode
      if (!isAdminMode) {
        fetchHomes(); // Fetch homes when setup dialog opens
        setIsProjectSetupOpen(true);
      }
    }
  };

  const fetchHomes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('homes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setHomes(data || []);
      
      // Auto-select primary home if exists
      const primaryHome = data?.find(home => home.is_primary);
      if (primaryHome) {
        setProjectSetupForm(prev => ({ ...prev, selectedHomeId: primaryHome.id }));
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
    }
  };

  const handleProjectSetupComplete = () => {
    // Here you could save the setup data to the project or context
    setProjectSetupForm({
      projectLeader: '',
      teamMate: '',
      targetEndDate: '',
      selectedHomeId: ''
    });
    setIsProjectSetupOpen(false);
    // Navigate to workflow view
    onProjectSelected?.();
  };

  const handleSkipSetup = () => {
    // Don't allow skipping if no home is selected
    if (!projectSetupForm.selectedHomeId) {
      return;
    }
    setIsProjectSetupOpen(false);
    // Navigate to workflow view
    onProjectSelected?.();
  };

  const handleDeleteProject = () => {
    if (!currentProject) return;
    console.log('handleDeleteProject called for project:', currentProject.name, 'with id:', currentProject.id);
    deleteProject(currentProject.id);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Project Management
        </CardTitle>
        <CardDescription>
          Select a project to manage its workflows, or create a new project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="project-select">Current Project</Label>
            <Select 
              value={currentProject?.id || ''} 
              onValueChange={handleProjectSelect2}
            >
              <SelectTrigger id="project-select">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter(project => {
                    const shouldInclude = isAdminMode ? true : (project.publishStatus === 'published' || project.publishStatus === 'beta-testing');
                    console.log('Project filter:', project.name, 'publishStatus:', project.publishStatus, 'include:', shouldInclude);
                    return shouldInclude;
                  })
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                      {isAdminMode && (
                        <Badge 
                          variant="outline" 
                          className="ml-2"
                        >
                          {project.publishStatus}
                        </Badge>
                      )}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to organize your workflows
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      placeholder="Enter project name"
                      value={newProjectForm.name}
                      onChange={(e) => setNewProjectForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      placeholder="Enter project description"
                      value={newProjectForm.description}
                      onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} disabled={!newProjectForm.name.trim()}>
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Edit Project Details button moved from ProjectManagementWindow */}
            {isAdminMode && currentProject && (
              <Button 
                onClick={onEditProjectDetails}
                size="sm" 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Project Details
              </Button>
            )}
          </div>
        </div>

        {currentProject && (
          <div className="space-y-4">
            {/* Project Info Card */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{currentProject.name}</h3>
                   <div className="mt-2">
                      {/* Project Image Display */}
                      {currentProject.image && (
                        <img 
                          src={currentProject.image} 
                          alt={currentProject.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <p className="text-sm text-muted-foreground">{currentProject.description}</p>
                      {isAdminMode && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{currentProject.category || 'Uncategorized'}</Badge>
                          <Badge 
                            variant="outline"
                            className={
                              currentProject.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                              currentProject.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              currentProject.difficulty === 'Advanced' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {currentProject.difficulty || 'Unset'}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={
                              currentProject.effortLevel === 'Low' ? 'bg-blue-100 text-blue-800' :
                              currentProject.effortLevel === 'Medium' ? 'bg-orange-100 text-orange-800' :
                              currentProject.effortLevel === 'High' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {currentProject.effortLevel || 'Unset'} Effort
                          </Badge>
                          <Badge 
                            variant={currentProject.publishStatus === 'published' ? 'default' : 'secondary'}
                            className={currentProject.publishStatus === 'published' ? 'bg-green-500 text-white' : ''}
                          >
                            {currentProject.publishStatus}
                          </Badge>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {currentProject.phases.length} phases
                      </p>
                     </div>
                 </div>
               </div>
             </div>
           </div>
         )}

        {/* Project Setup Dialog - Only show in user mode */}
        {!isAdminMode && (
          <Dialog open={isProjectSetupOpen} onOpenChange={setIsProjectSetupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Let's get this project going! 🚀</DialogTitle>
              <DialogDescription>
                Time to set up your project team and timeline. Let's make this happen!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-leader">Project Leader</Label>
                <Input
                  id="project-leader"
                  placeholder="Who's leading this adventure?"
                  value={projectSetupForm.projectLeader}
                  onChange={(e) => setProjectSetupForm(prev => ({ ...prev, projectLeader: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="team-mate">Team Mate</Label>
                <Input
                  id="team-mate"
                  placeholder="Who's helping you with this project?"
                  value={projectSetupForm.teamMate}
                  onChange={(e) => setProjectSetupForm(prev => ({ ...prev, teamMate: e.target.value }))}
                />
              </div>
               <div>
                <Label htmlFor="home-select">Select Home *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={projectSetupForm.selectedHomeId} 
                    onValueChange={(value) => setProjectSetupForm(prev => ({ ...prev, selectedHomeId: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a home for this project (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {homes.map((home) => (
                        <SelectItem key={home.id} value={home.id}>
                          {home.name} {home.is_primary ? '(Primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowHomeManager(true)}
                    className="px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="target-end-date">Target End Date</Label>
                <Input
                  id="target-end-date"
                  type="date"
                  value={projectSetupForm.targetEndDate}
                  onChange={(e) => setProjectSetupForm(prev => ({ ...prev, targetEndDate: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleSkipSetup}
                  disabled={!projectSetupForm.selectedHomeId}
                >
                  Skip for now
                </Button>
                <Button 
                  onClick={handleProjectSetupComplete}
                  disabled={!projectSetupForm.selectedHomeId}
                >
                  Let's do this!
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Home Manager Dialog */}
        <HomeManager 
          open={showHomeManager}
          onOpenChange={(open) => {
            setShowHomeManager(open);
            // Refresh homes list when dialog closes
            if (!open) {
              fetchHomes();
            }
          }}
        />
      </CardContent>
    </Card>
  );
};