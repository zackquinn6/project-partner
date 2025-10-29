import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/interfaces/Project';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Clock, Layers, Target, Hammer, Home, Palette, Zap, Shield, Search, Filter, AlertTriangle, Plus } from 'lucide-react';
import { MemoizedProjectCard } from '@/components/OptimizedComponents/MemoizedProjectCard';
import { supabase } from '@/integrations/supabase/client';
import DIYSurveyPopup from '@/components/DIYSurveyPopup';
import ProfileManager from '@/components/ProfileManager';
import { HomeManager } from '@/components/HomeManager';
import { BetaProjectWarning } from '@/components/BetaProjectWarning';
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
const ProjectCatalog: React.FC<ProjectCatalogProps> = ({
  isAdminMode = false
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    setCurrentProject,
    addProject,
    addProjectRun,
    projects,
    projectRuns
  } = useProject();

  // State for published projects when not authenticated
  const [publicProjects, setPublicProjects] = useState<any[]>([]);
  const [isProjectSetupOpen, setIsProjectSetupOpen] = useState(false);
  const [isDIYSurveyOpen, setIsDIYSurveyOpen] = useState(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState(false);
  const [isBetaWarningOpen, setIsBetaWarningOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Project | null>(null);
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(false);
  const [surveyMode, setSurveyMode] = useState<'new' | 'verify'>('new');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [homes, setHomes] = useState<any[]>([]);
  const [showHomeManager, setShowHomeManager] = useState(false);
  const [projectSetupForm, setProjectSetupForm] = useState({
    customProjectName: '',
    projectLeader: '',
    teamMate: '',
    targetEndDate: '',
    selectedHomeId: ''
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedEffortLevels, setSelectedEffortLevels] = useState<string[]>([]);

  // Check for search parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
      // Clear the URL parameter to keep it clean
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Reset dialog state when switching to admin mode
  React.useEffect(() => {
    if (isAdminMode) {
      setIsProjectSetupOpen(false);
      setIsDIYSurveyOpen(false);
      setIsProfileManagerOpen(false);
      setSelectedTemplate(null);
    }
  }, [isAdminMode]);

  // Fetch published projects for unauthenticated users
  useEffect(() => {
    if (!user && !isAdminMode) {
      const fetchPublicProjects = async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .in('publish_status', ['published', 'beta-testing']);
        
        if (data && !error) {
          setPublicProjects(data);
        }
      };
      
      fetchPublicProjects();
    }
  }, [user, isAdminMode]);

  // Use appropriate projects based on authentication status
  const availableProjects = user ? projects : publicProjects;
  
  // Filter projects to show published and beta projects or all projects in admin mode
  const publishedProjects = useMemo(() => 
    user 
      ? projects.filter(project => {
          const isValidStatus = (
            project.publishStatus === 'published' || 
            project.publishStatus === 'beta-testing' || 
            isAdminMode
          );
          const isNotManualTemplate = project.id !== '00000000-0000-0000-0000-000000000000';
          
          return isValidStatus && isNotManualTemplate;
        })
      : publicProjects.filter(project => 
          project.id !== '00000000-0000-0000-0000-000000000000' // Hide manual project template
        ), [projects, user, isAdminMode, publicProjects]);

  // Get unique filter options
  const availableCategories = useMemo(() => 
    [...new Set(publishedProjects.map(p => p.category).filter(Boolean))], 
    [publishedProjects]
  );
  
  const availableDifficulties = useMemo(() => 
    [...new Set(publishedProjects.map(p => p.difficulty).filter(Boolean))], 
    [publishedProjects]
  );
  
  const availableEffortLevels = useMemo(() => 
    [...new Set(publishedProjects.map(p => p.effortLevel).filter(Boolean))], 
    [publishedProjects]
  );

  // Filtered projects based on search and filters
  const filteredProjects = useMemo(() => {
    return publishedProjects.filter(project => {
      // Search filter
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.category?.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory = selectedCategories.length === 0 || 
        (project.category && selectedCategories.includes(project.category));

      // Difficulty filter
      const matchesDifficulty = selectedDifficulties.length === 0 || 
        (project.difficulty && selectedDifficulties.includes(project.difficulty));

      // Effort level filter
      const matchesEffortLevel = selectedEffortLevels.length === 0 || 
        (project.effortLevel && selectedEffortLevels.includes(project.effortLevel));

      return matchesSearch && matchesCategory && matchesDifficulty && matchesEffortLevel;
    });
  }, [publishedProjects, searchTerm, selectedCategories, selectedDifficulties, selectedEffortLevels]);

  // Filter handlers
  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDifficultyToggle = (difficulty: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(difficulty) 
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  };

  const handleEffortLevelToggle = (effortLevel: string) => {
    setSelectedEffortLevels(prev => 
      prev.includes(effortLevel) 
        ? prev.filter(e => e !== effortLevel)
        : [...prev, effortLevel]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSelectedDifficulties([]);
    setSelectedEffortLevels([]);
  };
  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);
  
  const getIconForCategory = useCallback((category: string) => {
    switch (category) {
      case 'Interior':
        return Palette;
      case 'Flooring':
        return Layers;
      case 'Kitchen':
        return Target;
      case 'Exterior':
        return Home;
      case 'Technology':
        return Zap;
      case 'Electrical':
        return Zap;
      case 'Maintenance':
        return Shield;
      default:
        return Hammer;
    }
  }, []);
  const handleSelectProject = async (project: any) => {
    try {
      console.log('🎯 ENTER handleSelectProject - Project:', project?.name || 'UNDEFINED');
      console.log('🎯 Admin mode:', isAdminMode, 'User exists:', !!user);
      
      if (!project) {
        console.error('❌ No project provided to handleSelectProject');
        return;
      }
      
      if (isAdminMode) {
        // In admin mode, create a new template project
        const newProject = {
          id: crypto.randomUUID(),
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
        navigate('/', {
          state: {
            view: 'admin'
          }
        });
        return;
      }

      // User mode - always create a new project run regardless of existing runs
      console.log('👤 USER MODE - Creating new project run for:', project.name);
      
      if (!user) {
        console.log('❌ No user found - redirecting to auth');
        navigate('/auth?return=projects');
        return;
      }

      // Check if project is beta and show warning first
      if (project.publishStatus === 'beta-testing') {
        console.log('⚠️ Beta project detected, showing warning');
        setSelectedTemplate(project);
        setIsBetaWarningOpen(true);
        return;
      }

      // Always create a new project run - user expects a fresh start
      setSelectedTemplate(project);
      console.log('✅ Creating new project run for:', project.name);
      proceedToNewProject(project);
      
    } catch (error) {
      console.error('❌ Error in handleSelectProject:', error);
    }
  };

  const handleDIYSurveyComplete = (surveyCompleted: boolean = true) => {
    console.log('handleDIYSurveyComplete called with:', surveyCompleted);
    setIsDIYSurveyOpen(false);
    if (surveyCompleted) {
      // After DIY survey completion, proceed to workflow
      console.log('Survey completed - proceeding to workflow');
      proceedToWorkflow();
    } else {
      // If survey was cancelled, reset everything
      console.log('Survey cancelled - resetting');
      resetProjectState();
    }
  };

  const handleProfileManagerComplete = () => {
    console.log('ProfileManager completed - proceeding to workflow');
    setIsProfileManagerOpen(false);
    proceedToWorkflow();
  };

  const proceedToWorkflow = () => {
    if (!selectedTemplate) return;

    // Create a new project RUN based on the template
    const newProjectRun = {
      templateId: selectedTemplate.id,
      name: projectSetupForm.customProjectName || selectedTemplate.name,
      description: selectedTemplate.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: projectSetupForm.targetEndDate ? new Date(projectSetupForm.targetEndDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'not-started' as const,
      // User customization data
      projectLeader: projectSetupForm.projectLeader,
      teamMate: projectSetupForm.teamMate,
      customProjectName: projectSetupForm.customProjectName,
      // Runtime data
      completedSteps: [],
      progress: 0,
      // Copy template data
      phases: selectedTemplate.phases,
      category: selectedTemplate.category,
      effortLevel: selectedTemplate.effortLevel,
      skillLevel: selectedTemplate.skillLevel,
      estimatedTime: selectedTemplate.estimatedTime,
      diyLengthChallenges: selectedTemplate.diyLengthChallenges
    };
    
    // Pass navigation callback to addProjectRun
    addProjectRun(newProjectRun, (projectRunId: string) => {
      console.log("🎯 ProjectCatalog: Project run created, navigating to kickoff with ID:", projectRunId);
      resetProjectState();
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRunId
        }
      });
    });
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

  const resetProjectState = () => {
    setProjectSetupForm({
      customProjectName: '',
      projectLeader: '',
      teamMate: '',
      targetEndDate: '',
      selectedHomeId: ''
    });
    setSelectedTemplate(null);
    setUserProfile(null);
    setHomes([]);
  };
  const handleProjectSetupComplete = async () => {
    // Prevent this from running during new project creation
    if (isCreatingNewProject) {
      console.log('🚫 handleProjectSetupComplete: Blocked during new project creation');
      return;
    }
    
    if (!selectedTemplate || !user) return;

    // Close project setup dialog
    setIsProjectSetupOpen(false);

    // Check user profile to determine next step
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('survey_completed_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.survey_completed_at) {
        // Existing user - show ProfileManager
        setIsProfileManagerOpen(true);
      } else {
        // New user - show DIY survey in 'new' mode
        setSurveyMode('new');
        setUserProfile(null);
        setIsDIYSurveyOpen(true);
      }
    } catch (error) {
      console.error('Error checking profile:', error);
      // Default to new survey on error
      setSurveyMode('new');
      setUserProfile(null);
      setIsDIYSurveyOpen(true);
    }
  };
  const proceedToNewProject = (template?: any) => {
    const projectTemplate = template || selectedTemplate;
    if (!projectTemplate) return;

    console.log('🎯 proceedToNewProject: Starting new project creation for:', projectTemplate.name);
    
    // Set flag to prevent double-clicks during creation
    if (isCreatingNewProject) {
      console.log('🚫 Already creating project, aborting');
      return;
    }
    setIsCreatingNewProject(true);
    
    // Explicitly close ALL dialogs before proceeding - this is critical
    setIsProjectSetupOpen(false);
    setIsDIYSurveyOpen(false);
    setIsProfileManagerOpen(false);
    setIsBetaWarningOpen(false);

    // Create a new project RUN based on the template without setup info
    const newProjectRun = {
      templateId: projectTemplate.id,
      name: projectTemplate.name,
      description: projectTemplate.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'not-started' as const,
      // No user customization data when skipping
      completedSteps: [],
      progress: 0,
      // Copy template data
      phases: projectTemplate.phases,
      category: projectTemplate.category,
      effortLevel: projectTemplate.effortLevel,
      skillLevel: projectTemplate.skillLevel,
      estimatedTime: projectTemplate.estimatedTime,
      diyLengthChallenges: projectTemplate.diyLengthChallenges
    };
    
    // Pass navigation callback to addProjectRun
    addProjectRun(newProjectRun, (projectRunId: string) => {
      console.log("🎯 ProjectCatalog: Project run created (new project), navigating to kickoff with ID:", projectRunId);
      
      // Reset state immediately
      setSelectedTemplate(null);
      setIsCreatingNewProject(false);
      
      // Navigate immediately to kickoff
      // Navigate to user view and trigger kickoff workflow
      if (window.innerWidth < 768) {
        // On mobile, navigate to mobile workflow view 
        navigate('/', {
          state: {
            view: 'user',
            projectRunId: projectRunId,
            mobileView: 'workflow'
          }
        });
      } else {
        // On desktop, navigate to user view
        navigate('/', {
          state: {
            view: 'user',
            projectRunId: projectRunId
          }
        });
      }
    });
  };

  const handleSkipSetup = () => {
    if (!selectedTemplate) return;

    // Create a new project RUN based on the template without setup info
    const newProjectRun = {
      templateId: selectedTemplate.id,
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'not-started' as const,
      // No user customization data when skipping
      completedSteps: [],
      progress: 0,
      // Copy template data
      phases: selectedTemplate.phases,
      category: selectedTemplate.category,
      effortLevel: selectedTemplate.effortLevel,
      skillLevel: selectedTemplate.skillLevel,
      estimatedTime: selectedTemplate.estimatedTime,
      diyLengthChallenges: selectedTemplate.diyLengthChallenges
    };
    
    // Pass navigation callback to addProjectRun
    addProjectRun(newProjectRun, (projectRunId: string) => {
      console.log("🎯 ProjectCatalog: Project run created (skip setup), navigating to kickoff with ID:", projectRunId);
      
      // Reset form and close dialog
      setProjectSetupForm({
        customProjectName: '',
        projectLeader: '',
        teamMate: '',
        targetEndDate: '',
        selectedHomeId: ''
      });
      setIsProjectSetupOpen(false);
      setSelectedTemplate(null);
      
      navigate('/', {
        state: {
          view: 'user',
          projectRunId: projectRunId
        }
      });
    });
  };

  const handleBetaAccept = () => {
    // After accepting beta warning, proceed with normal project setup flow
    if (!selectedTemplate || !user) return;
    
    setProjectSetupForm(prev => ({
      ...prev,
      customProjectName: selectedTemplate.name
    }));
    
    // Check if there's an active project run for this template
    const existingRun = projectRuns.find(run => 
      run.templateId === selectedTemplate.id && 
      run.status !== 'complete'
    );
    
    // If there's an existing project run, check if kickoff is complete
    if (existingRun) {
      const kickoffStepIds = ['kickoff-step-1', 'kickoff-step-2', 'kickoff-step-3'];
      const kickoffComplete = kickoffStepIds.every(stepId => 
        existingRun.completedSteps.includes(stepId)
      );
      
        // Only show project setup dialog if kickoff is complete
        if (kickoffComplete) {
          setIsProjectSetupOpen(true);
        } else {
          // Kickoff not complete, navigate to continue the existing project run
          console.log('ProjectCatalog: Kickoff not complete after beta accept, continuing existing project run:', existingRun.id);
          navigate('/', {
            state: {
              view: 'user',
              projectRunId: existingRun.id
            }
          });
        }
      } else {
        // New project run, will go through kickoff flow - start project creation process
        console.log('🚀 ProjectCatalog: New project after beta accept, proceeding directly to kickoff');
        proceedToNewProject(selectedTemplate);
      }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-y-auto">
      <div className="container mx-auto px-6 py-8 min-h-screen">
            <div className="hidden md:flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              Project Catalog
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Select a project to get started with confidence</p>
        </div>

        {/* Mobile Close Button */}
        <div className="md:hidden flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="text-sm"
          >
            Close
          </Button>
        </div>

        {/* Filters Header Bar */}
        <div className="bg-card border rounded-lg p-6 mb-8 space-y-4">
          {/* Mobile: Compact filter layout */}
          <div className="md:hidden space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Compact filter row */}
            <div className="flex gap-2">
              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {availableCategories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Skill Level Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    Skill {selectedDifficulties.length > 0 && `(${selectedDifficulties.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {availableDifficulties.map((difficulty) => (
                    <DropdownMenuCheckboxItem
                      key={difficulty}
                      checked={selectedDifficulties.includes(difficulty)}
                      onCheckedChange={() => handleDifficultyToggle(difficulty)}
                    >
                      {difficulty}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Effort Level Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    Effort {selectedEffortLevels.length > 0 && `(${selectedEffortLevels.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  {availableEffortLevels.map((effortLevel) => (
                    <DropdownMenuCheckboxItem
                      key={effortLevel}
                      checked={selectedEffortLevels.includes(effortLevel)}
                      onCheckedChange={() => handleEffortLevelToggle(effortLevel)}
                    >
                      {effortLevel}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clear Filters */}
            {(searchTerm || selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0) && (
              <Button variant="ghost" onClick={clearAllFilters} className="text-muted-foreground text-xs" size="sm">
                Clear All
              </Button>
            )}
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden md:block">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {availableCategories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    >
                      {category}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Skill Level Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Skill Level {selectedDifficulties.length > 0 && `(${selectedDifficulties.length})`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {availableDifficulties.map((difficulty) => (
                    <DropdownMenuCheckboxItem
                      key={difficulty}
                      checked={selectedDifficulties.includes(difficulty)}
                      onCheckedChange={() => handleDifficultyToggle(difficulty)}
                    >
                      {difficulty}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Effort Level Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Effort Level {selectedEffortLevels.length > 0 && `(${selectedEffortLevels.length})`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {availableEffortLevels.map((effortLevel) => (
                    <DropdownMenuCheckboxItem
                      key={effortLevel}
                      checked={selectedEffortLevels.includes(effortLevel)}
                      onCheckedChange={() => handleEffortLevelToggle(effortLevel)}
                    >
                      {effortLevel}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Filters */}
              {(searchTerm || selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0) && (
                <Button variant="ghost" onClick={clearAllFilters} className="text-muted-foreground">
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Active filters display */}
          {(selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <Badge key={category} variant="secondary" className="flex items-center gap-1">
                  {category}
                  <button
                    onClick={() => handleCategoryToggle(category)}
                    className="ml-1 text-xs hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {selectedDifficulties.map((difficulty) => (
                <Badge key={difficulty} variant="secondary" className="flex items-center gap-1">
                  {difficulty}
                  <button
                    onClick={() => handleDifficultyToggle(difficulty)}
                    className="ml-1 text-xs hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
              {selectedEffortLevels.map((effortLevel) => (
                <Badge key={effortLevel} variant="secondary" className="flex items-center gap-1">
                  {effortLevel}
                  <button
                    onClick={() => handleEffortLevelToggle(effortLevel)}
                    className="ml-1 text-xs hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6 text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {publishedProjects.length} projects
        </div>

        {/* Project Grid - Mobile: Row layout, Desktop: Grid */}
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">
                {publishedProjects.length === 0 
                  ? (isAdminMode ? "No template projects exist yet. Create your first template project to get started." : "No published projects available yet. Check back soon!")
                  : "No projects match your current filters. Try adjusting your search or filters."
                }
              </p>
              {publishedProjects.length === 0 && isAdminMode && (
                <Button onClick={() => navigate('/', {
                  state: {
                    view: 'admin'
                  }
                })}>
                  Create First Template
                </Button>
              )}
              {filteredProjects.length === 0 && publishedProjects.length > 0 && (
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            filteredProjects.map(project => {
              const IconComponent = getIconForCategory(project.category || '');
              return (
                <div key={project.id}>
                  {/* Mobile: Row layout */}
                  <Card 
                    className="md:hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border bg-card overflow-hidden" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖱️ MOBILE CARD CLICK - Project:', project.name);
                      try {
                        handleSelectProject(project);
                      } catch (error) {
                        console.error('❌ Error in handleSelectProject:', error);
                      }
                    }}
                  >
                    <div className="flex items-center gap-0">
                      {/* Cover Image or Icon */}
                      <div className="flex-shrink-0 w-24 h-24">
                        {((project as any).cover_image || project.image || (project as any).images?.[0]) ? (
                          <img 
                            src={(project as any).cover_image || project.image || (project as any).images?.[0]} 
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                            <IconComponent className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Project info */}
                      <div className="flex-1 min-w-0 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          {project.publishStatus === 'beta-testing' && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs flex-shrink-0">
                              BETA
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Desktop: Card layout */}
                  <Card 
                    className="hidden md:block group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 overflow-hidden" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖱️ DESKTOP CARD CLICK - Project:', project.name);
                      try {
                        handleSelectProject(project);
                      } catch (error) {
                        console.error('❌ Error in handleSelectProject:', error);
                      }
                    }}
                  >
                    {/* Cover Image or Gradient Header */}
                    {((project as any).cover_image || project.image || (project as any).images?.[0]) ? (
                      <div className="h-48 relative overflow-hidden">
                        <img 
                          src={(project as any).cover_image || project.image || (project as any).images?.[0]} 
                          alt={project.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-4 right-4 flex gap-2">
                          {project.publishStatus === 'beta-testing' && (
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 border-orange-300/30 backdrop-blur-sm">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              BETA
                            </Badge>
                          )}
                          {isAdminMode && (
                            <Badge variant="secondary" className={`${project.publishStatus === 'published' ? 'bg-green-500/20 text-green-300' : project.publishStatus === 'beta-testing' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'} backdrop-blur-sm`}>
                              {project.publishStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-primary to-orange-500 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <IconComponent className="w-16 h-16 text-white/80" />
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2">
                          {project.publishStatus === 'beta-testing' && (
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 border-orange-300/30">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              BETA
                            </Badge>
                          )}
                          {isAdminMode && (
                            <Badge variant="secondary" className={`${project.publishStatus === 'published' ? 'bg-green-500/20 text-green-300' : project.publishStatus === 'beta-testing' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                              {project.publishStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      <Button 
                        size="sm" 
                        className="w-full" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔘 DESKTOP BUTTON CLICK - Project:', project.name);
                          try {
                            handleSelectProject(project);
                          } catch (error) {
                            console.error('❌ Error in button handleSelectProject:', error);
                          }
                        }}
                      >
                        {isAdminMode ? 'Edit Template' : 'Start Project'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })
          )}
        </div>

        {/* Categories Filter (Future Enhancement) */}
        <div className="mt-12 text-center">
          
        </div>

        {/* Project Setup Dialog - Only show in user mode */}
        {!isAdminMode && <Dialog open={isProjectSetupOpen} onOpenChange={setIsProjectSetupOpen}>
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
                  <Input id="custom-project-name" placeholder="Give your project a custom name" value={projectSetupForm.customProjectName} onChange={e => setProjectSetupForm(prev => ({
                ...prev,
                customProjectName: e.target.value
              }))} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on: {selectedTemplate?.name}
                  </p>
                </div>
                <div>
                  <Label htmlFor="project-leader">Project Leader</Label>
                  <Input id="project-leader" placeholder="Who's leading this adventure?" value={projectSetupForm.projectLeader} onChange={e => setProjectSetupForm(prev => ({
                ...prev,
                projectLeader: e.target.value
              }))} />
                </div>
                <div>
                  <Label htmlFor="team-mate">Team Mate</Label>
                  <Input id="team-mate" placeholder="Who's helping you with this project?" value={projectSetupForm.teamMate} onChange={e => setProjectSetupForm(prev => ({
                ...prev,
                teamMate: e.target.value
              }))} />
                </div>
                <div>
                  <Label htmlFor="home-select">Select Home</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={projectSetupForm.selectedHomeId} 
                      onValueChange={(value) => setProjectSetupForm(prev => ({ ...prev, selectedHomeId: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Choose a home for this project" />
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
                  <Input id="target-end-date" type="date" value={projectSetupForm.targetEndDate} onChange={e => setProjectSetupForm(prev => ({
                ...prev,
                targetEndDate: e.target.value
              }))} />
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
          </Dialog>}

        {/* DIY Survey Dialog - Only show in user mode */}
        {!isAdminMode && (
          <DIYSurveyPopup 
            open={isDIYSurveyOpen} 
            onOpenChange={(open) => {
              console.log('DIYSurveyPopup onOpenChange called with:', open);
              if (!open) {
                handleDIYSurveyComplete(true);
              }
            }}
            mode={surveyMode}
            initialData={userProfile}
          />
        )}

        {/* Profile Manager Dialog - Only show in user mode */}
        {!isAdminMode && (
          <ProfileManager
            open={isProfileManagerOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleProfileManagerComplete();
              }
            }}
          />
        )}

         {/* Home Manager Dialog - Only show in user mode */}
         {!isAdminMode && (
           <HomeManager
             open={showHomeManager}
             onOpenChange={(open) => {
               setShowHomeManager(open);
               if (!open) {
                 fetchHomes(); // Refresh homes when dialog closes
               }
             }}
           />
         )}
        {!isAdminMode && selectedTemplate && (
          <BetaProjectWarning
            projectName={selectedTemplate.name}
            open={isBetaWarningOpen}
            onOpenChange={setIsBetaWarningOpen}
            onAccept={handleBetaAccept}
          />
        )}
      </div>
    </div>;
};
export default ProjectCatalog;