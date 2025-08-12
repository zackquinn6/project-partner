import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Project } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FolderOpen } from 'lucide-react';

interface ProjectSelectorProps {
  isAdminMode?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ isAdminMode = false }) => {
  const { projects, currentProject, setCurrentProject, addProject } = useProject();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: ''
  });
  const [projectSetupForm, setProjectSetupForm] = useState({
    projectLeader: '',
    accountabilityPartner: '',
    targetEndDate: ''
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
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold">{currentProject.name}</h3>
            <p className="text-sm text-muted-foreground">{currentProject.description}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {currentProject.phases.length} phases
            </p>
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