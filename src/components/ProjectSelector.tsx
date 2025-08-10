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

export const ProjectSelector: React.FC = () => {
  const { projects, currentProject, setCurrentProject, addProject } = useProject();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: ''
  });

  const handleCreateProject = () => {
    if (!newProjectForm.name.trim()) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectForm.name,
      description: newProjectForm.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      phases: []
    };

    addProject(newProject);
    setCurrentProject(newProject);
    setNewProjectForm({ name: '', description: '' });
    setIsNewProjectOpen(false);
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
              onValueChange={(value) => {
                const project = projects.find(p => p.id === value);
                setCurrentProject(project || null);
              }}
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
      </CardContent>
    </Card>
  );
};