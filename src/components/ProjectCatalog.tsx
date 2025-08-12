import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, Layers, Target, Hammer, Home, Palette, Zap, Shield } from 'lucide-react';
import { ProjectSelector } from '@/components/ProjectSelector';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  phases: number;
  image: string;
  color: string;
  icon: React.ComponentType<any>;
}

interface ProjectCatalogProps {
  isAdminMode?: boolean;
}

const ProjectCatalog: React.FC<ProjectCatalogProps> = ({ isAdminMode = false }) => {
  const navigate = useNavigate();
  const { setCurrentProject, addProject, projects } = useProject();
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [projectSetupForm, setProjectSetupForm] = useState({
    customProjectName: '',
    projectLeader: '',
    accountabilityPartner: '',
    targetEndDate: ''
  });

  // Reset dialog state when switching to admin mode
  React.useEffect(() => {
    if (isAdminMode) {
      setIsProjectSetupOpen(false);
      setSelectedTemplate(null);
    }
  }, [isAdminMode]);

  // Sample project templates based on the projects mentioned in Home component
  const projectTemplates: ProjectTemplate[] = [
    {
      id: 'interior-painting',
      name: 'Interior Painting',
      description: 'Transform your space with professional interior painting techniques',
      category: 'Interior',
      difficulty: 'Beginner',
      estimatedTime: '2-3 days',
      phases: 4,
      image: '/placeholder.svg',
      color: 'from-blue-500 to-purple-600',
      icon: Palette
    },
    {
      id: 'tile-flooring',
      name: 'Tile Flooring',
      description: 'Complete tile flooring installation from planning to finish',
      category: 'Flooring',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 weeks',
      phases: 3,
      image: '/placeholder.svg',
      color: 'from-orange-500 to-red-600',
      icon: Layers
    },
    {
      id: 'lvp-flooring',
      name: 'LVP Flooring',
      description: 'Luxury vinyl plank flooring installation made simple',
      category: 'Flooring',
      difficulty: 'Beginner',
      estimatedTime: '3-5 days',
      phases: 3,
      image: '/placeholder.svg',
      color: 'from-green-500 to-teal-600',
      icon: Layers
    },
    {
      id: 'tile-backsplash',
      name: 'Tile Backsplash',
      description: 'Add style and protection with a beautiful tile backsplash',
      category: 'Kitchen',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 days',
      phases: 3,
      image: '/placeholder.svg',
      color: 'from-purple-500 to-pink-600',
      icon: Target
    },
    {
      id: 'landscaping',
      name: 'Landscaping',
      description: 'Design and create beautiful outdoor spaces',
      category: 'Exterior',
      difficulty: 'Intermediate',
      estimatedTime: '1-3 weeks',
      phases: 5,
      image: '/placeholder.svg',
      color: 'from-green-600 to-lime-600',
      icon: Home
    },
    {
      id: 'power-washing',
      name: 'Power Washing',
      description: 'Restore surfaces with proper power washing techniques',
      category: 'Exterior',
      difficulty: 'Beginner',
      estimatedTime: '1 day',
      phases: 2,
      image: '/placeholder.svg',
      color: 'from-cyan-500 to-blue-600',
      icon: Zap
    },
    {
      id: 'smart-home',
      name: 'Smart Home',
      description: 'Install and configure smart home automation systems',
      category: 'Technology',
      difficulty: 'Advanced',
      estimatedTime: '1-2 weeks',
      phases: 4,
      image: '/placeholder.svg',
      color: 'from-indigo-500 to-purple-600',
      icon: Zap
    },
    {
      id: 'drywall',
      name: 'Drywall',
      description: 'Master drywall installation and finishing techniques',
      category: 'Interior',
      difficulty: 'Intermediate',
      estimatedTime: '1 week',
      phases: 4,
      image: '/placeholder.svg',
      color: 'from-gray-500 to-slate-600',
      icon: Hammer
    },
    {
      id: 'lighting',
      name: 'Lighting',
      description: 'Install and upgrade lighting fixtures safely',
      category: 'Electrical',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 days',
      phases: 3,
      image: '/placeholder.svg',
      color: 'from-yellow-500 to-orange-600',
      icon: Zap
    },
    {
      id: 'home-maintenance',
      name: 'Home Maintenance',
      description: 'Essential maintenance tasks to keep your home in top condition',
      category: 'Maintenance',
      difficulty: 'Beginner',
      estimatedTime: 'Ongoing',
      phases: 6,
      image: '/placeholder.svg',
      color: 'from-emerald-500 to-green-600',
      icon: Shield
    }
  ];

  // Filter projects to show only published templates
  const publishedProjects = projects.filter(project => 
    project.publishStatus === 'published' && 
    project.id.startsWith('template-')
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'Interior': return Palette;
      case 'Flooring': return Layers;
      case 'Kitchen': return Target;
      case 'Exterior': return Home;
      case 'Technology': return Zap;
      case 'Electrical': return Zap;
      case 'Maintenance': return Shield;
      default: return Hammer;
    }
  };

  const handleSelectProject = (project: any) => {
    if (isAdminMode) {
      // In admin mode, just navigate to admin view with this template
      const newProject = {
        id: Date.now().toString(),
        name: project.name,
        description: project.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(),
        planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'not-started' as const,
        publishStatus: 'draft' as const,
        category: project.category,
        difficulty: project.difficulty,
        estimatedTime: project.estimatedTime,
        phases: []
      };
      addProject(newProject);
      setCurrentProject(newProject);
      navigate('/', { state: { view: 'admin' } });
    } else {
      // In user mode, show the setup dialog
      setSelectedTemplate(project);
      setProjectSetupForm(prev => ({ ...prev, customProjectName: project.name }));
      setIsProjectSetupOpen(true);
    }
  };

  const handleProjectSetupComplete = () => {
    if (!selectedTemplate) return;

    // Create a new project based on the template
    const newProject = {
      id: Date.now().toString(),
      name: projectSetupForm.customProjectName || selectedTemplate.name,
      description: selectedTemplate.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'not-started' as const,
      publishStatus: 'draft' as const,
      category: selectedTemplate.category,
      difficulty: selectedTemplate.difficulty,
      estimatedTime: selectedTemplate.estimatedTime,
      phases: [] // Start with empty phases, user can build from template
    };

    addProject(newProject);
    setCurrentProject(newProject);
    
    // Reset form and close dialog
    setProjectSetupForm({
      customProjectName: '',
      projectLeader: '',
      accountabilityPartner: '',
      targetEndDate: ''
    });
    setIsProjectSetupOpen(false);
    setSelectedTemplate(null);
    
    // Navigate directly to workflow view in user mode
    navigate('/', { state: { view: 'user' } });
  };

  const handleSkipSetup = () => {
    if (!selectedTemplate) return;

    // Create a new project based on the template without setup details
    const newProject = {
      id: Date.now().toString(),
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'not-started' as const,
      publishStatus: 'draft' as const,
      category: selectedTemplate.category,
      difficulty: selectedTemplate.difficulty,
      estimatedTime: selectedTemplate.estimatedTime,
      phases: [] // Start with empty phases, user can build from template
    };

    addProject(newProject);
    setCurrentProject(newProject);
    
    setIsProjectSetupOpen(false);
    setSelectedTemplate(null);
    
    // Navigate directly to workflow view in user mode
    navigate('/', { state: { view: 'user' } });
  };

  const categories = [...new Set(publishedProjects.map(p => p.category))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>

        {/* Project Selector for existing projects */}
        {!isAdminMode && (
          <ProjectSelector onProjectSelected={() => navigate('/', { state: { view: 'user' } })} />
        )}

        <div className="text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            {!isAdminMode ? 'Or Start a New' : 'Choose Your'}{" "}
            <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              Project
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {!isAdminMode 
              ? 'Create a new project from our expertly crafted templates'
              : 'Select from our expertly crafted project guides to get started with confidence'
            }
          </p>
        </div>

        {/* Project Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {publishedProjects.map((project) => {
            const IconComponent = getIconForCategory(project.category || '');
            
            return (
              <Card 
                key={project.id} 
                className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden"
                onClick={() => handleSelectProject(project)}
              >
                <div className={`h-32 bg-gradient-to-br from-primary to-orange-500 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {project.category}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {project.name}
                  </CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {project.estimatedTime}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Layers className="w-4 h-4" />
                      {project.phases?.length || 0} phases
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(project.difficulty || '')} variant="secondary">
                      {project.difficulty}
                    </Badge>
                    <Button 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project);
                      }}
                    >
                      Start Project
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Categories Filter (Future Enhancement) */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            More project templates coming soon! Can't find what you're looking for?{" "}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/projects?mode=admin')}>
              Create a custom project
            </Button>
          </p>
        </div>

        {/* Project Setup Dialog - Only show in user mode */}
        {!isAdminMode && (
          <Dialog open={isProjectSetupOpen} onOpenChange={setIsProjectSetupOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Let's get this project going! 🚀</DialogTitle>
                <DialogDescription>
                  Time to set up your {selectedTemplate?.name} project team and timeline. Let's make this happen!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-project-name">Project Name</Label>
                  <Input
                    id="custom-project-name"
                    placeholder="Give your project a custom name"
                    value={projectSetupForm.customProjectName}
                    onChange={(e) => setProjectSetupForm(prev => ({ ...prev, customProjectName: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on: {selectedTemplate?.name}
                  </p>
                </div>
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
                  <Button variant="outline" onClick={handleSkipSetup}>
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
      </div>
    </div>
  );
};

export default ProjectCatalog;