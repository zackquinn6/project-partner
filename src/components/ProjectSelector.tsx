import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FolderOpen, Edit, Save, X } from 'lucide-react';

interface ProjectSelectorProps {
  isAdminMode?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ isAdminMode = false }) => {
  const { projects, currentProject, setCurrentProject, addProject, updateProject } = useProject();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: ''
  });
  const [projectSetupForm, setProjectSetupForm] = useState({
    projectLeader: '',
    accountabilityPartner: '',
    targetEndDate: ''
  });
  const [editingForm, setEditingForm] = useState({
    description: '',
    category: '',
    difficulty: '',
    publishStatus: 'draft' as 'draft' | 'published'
  });

  const handleCreateProject = () => {
    if (!newProjectForm.name.trim()) return;

    const newProject: Project = {
      id: Date.now().toString(),
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

  const handleProjectSelect = (value: string) => {
    const project = projects.find(p => p.id === value);
    if (project && project.id !== currentProject?.id) {
      setCurrentProject(project);
      // Initialize editing form with current project data
      if (isAdminMode) {
        setEditingForm({
          description: project.description,
          category: project.category || '',
          difficulty: project.difficulty || '',
          publishStatus: project.publishStatus
        });
      }
      // Only open setup dialog in user mode, not admin mode
      if (!isAdminMode) {
        setIsProjectSetupOpen(true);
      }
    }
  };

  const handleProjectSetupComplete = () => {
    // Here you could save the setup data to the project or context
    setProjectSetupForm({
      projectLeader: '',
      accountabilityPartner: '',
      targetEndDate: ''
    });
    setIsProjectSetupOpen(false);
  };

  const handleStartEditProject = () => {
    if (!currentProject) return;
    setEditingForm({
      description: currentProject.description,
      category: currentProject.category || '',
      difficulty: currentProject.difficulty || '',
      publishStatus: currentProject.publishStatus
    });
    setIsEditingProject(true);
  };

  const handleSaveProjectChanges = () => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      description: editingForm.description,
      category: editingForm.category,
      difficulty: editingForm.difficulty as 'Beginner' | 'Intermediate' | 'Advanced' | undefined,
      publishStatus: editingForm.publishStatus,
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
    setIsEditingProject(false);
  };

  const handleCancelEdit = () => {
    setIsEditingProject(false);
    if (currentProject) {
      setEditingForm({
        description: currentProject.description,
        category: currentProject.category || '',
        difficulty: currentProject.difficulty || '',
        publishStatus: currentProject.publishStatus
      });
    }
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
              onValueChange={handleProjectSelect}
            >
              <SelectTrigger id="project-select">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
        </div>

        {currentProject && (
          <div className="space-y-4">
            {/* Project Info Card */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{currentProject.name}</h3>
                  {isAdminMode && isEditingProject ? (
                    <div className="space-y-3 mt-3">
                      <div>
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea
                          id="edit-description"
                          value={editingForm.description}
                          onChange={(e) => setEditingForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Project description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="edit-category">Category</Label>
                          <Select 
                            value={editingForm.category} 
                            onValueChange={(value) => setEditingForm(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Interior">Interior</SelectItem>
                              <SelectItem value="Flooring">Flooring</SelectItem>
                              <SelectItem value="Kitchen">Kitchen</SelectItem>
                              <SelectItem value="Exterior">Exterior</SelectItem>
                              <SelectItem value="Technology">Technology</SelectItem>
                              <SelectItem value="Electrical">Electrical</SelectItem>
                              <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit-difficulty">Difficulty</Label>
                          <Select 
                            value={editingForm.difficulty} 
                            onValueChange={(value) => setEditingForm(prev => ({ ...prev, difficulty: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="edit-status">Publish Status</Label>
                        <Select 
                          value={editingForm.publishStatus} 
                          onValueChange={(value) => setEditingForm(prev => ({ ...prev, publishStatus: value as 'draft' | 'published' }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveProjectChanges}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
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
                  )}
                </div>
                {isAdminMode && !isEditingProject && (
                  <Button size="sm" variant="outline" onClick={handleStartEditProject}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Project
                  </Button>
                )}
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
                <Label htmlFor="accountability-partner">Accountability Partner</Label>
                <Input
                  id="accountability-partner"
                  placeholder="Who's keeping you on track?"
                  value={projectSetupForm.accountabilityPartner}
                  onChange={(e) => setProjectSetupForm(prev => ({ ...prev, accountabilityPartner: e.target.value }))}
                />
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
                <Button variant="outline" onClick={() => setIsProjectSetupOpen(false)}>
                  Skip for now
                </Button>
                <Button onClick={handleProjectSetupComplete}>
                  Let's do this!
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};