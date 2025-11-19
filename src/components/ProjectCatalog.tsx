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
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Clock, Layers, Target, Hammer, Home, Palette, Zap, Shield, Search, Filter, AlertTriangle, Plus, Info } from 'lucide-react';
import { MemoizedProjectCard } from '@/components/OptimizedComponents/MemoizedProjectCard';
import { supabase } from '@/integrations/supabase/client';
import DIYSurveyPopup from '@/components/DIYSurveyPopup';
import ProfileManager from '@/components/ProfileManager';
import { HomeManager } from '@/components/HomeManager';
import { BetaProjectWarning } from '@/components/BetaProjectWarning';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  onClose?: () => void;
}
const FILTER_DESCRIPTIONS = {
  category: "The type of project you'll be running.",
  skill: "Matches your experience level. Beginner: new to projects. Intermediate: comfortable with light/medium DIY work but not advanced trades. Advanced: have delivered high-skill projects like trim, tile, electrical, or plumbing with great results.",
  effort: "Represents the physical effort required. Painting might be low effort, while demolishing an old kitchen is high effort.",
  projectType: "Primary projects can stand on their own (e.g., install tile flooring). Secondary projects usually support a main effort (e.g., demo flooring or install baseboard)."
} as const;

const FilterMenuHeader: React.FC<{ label: string; description: string }> = ({ label, description }) => (
  <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center justify-between">
    <span>{label}</span>
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`${label} info`}
          >
            <Info className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

const ProjectCatalog: React.FC<ProjectCatalogProps> = ({
  isAdminMode = false,
  onClose
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    setCurrentProject,
    addProject,
    addProjectRun,
    projects,
    projectRuns,
    fetchProjects
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
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'primary' | 'secondary'>('all');
  const projectTypeLabel = projectTypeFilter === 'all' ? '' : projectTypeFilter === 'primary' ? 'Primary' : 'Secondary';

  const ProjectTypeTooltip = () => (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex items-center justify-center rounded-full p-1 cursor-help text-muted-foreground hover:text-foreground">
            <Info className="w-4 h-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p className="font-semibold mb-1">Primary vs Secondary</p>
          <p>Primary projects can stand alone, like building a deck, painting a room, or installing tile floors.</p>
          <p className="mt-2">Secondary projects typically support a primary project, like demoing floors, installing baseboard, or applying self-leveling concrete.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const getProjectTypeValue = useCallback((project: any) => {
    const rawType = (project.projectType || project.project_type || '').toString().toLowerCase();
    return rawType === 'secondary' ? 'secondary' : 'primary';
  }, []);

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
        console.log('🔍 Fetching public projects...');
        const { data, error } = await supabase
          .from('project_templates_live')
          .select('*')
          .in('publish_status', ['published', 'beta-testing'])
          .order('updated_at', { ascending: false });
        
        console.log('📦 Public projects fetch result:', { dataCount: data?.length || 0, error });
        
        if (data && !error) {
          setPublicProjects(data);
        } else if (error) {
          console.error('❌ Error fetching public projects:', error);
        }
      };
      
      fetchPublicProjects();
    } else if (user && !isAdminMode) {
      // Refresh projects when catalog is opened to ensure latest revisions
      console.log('🔄 User authenticated, fetching projects via context...');
      fetchProjects();
    }
  }, [user, isAdminMode, fetchProjects]);

  // Use appropriate projects based on authentication status
  const availableProjects = user ? projects : publicProjects;
  
  // Debug logging for projects
  useEffect(() => {
    console.log('🔍 ProjectCatalog Debug:', {
      user: !!user,
      isAdminMode,
      projectsCount: projects.length,
      publicProjectsCount: publicProjects.length,
      projects: projects.map(p => ({ 
        id: p.id, 
        name: p.name, 
        publishStatus: p.publishStatus,
        isCurrentVersion: (p as any).is_current_version 
      })),
      publicProjects: publicProjects.map(p => ({
        id: p.id,
        name: p.name,
        publish_status: p.publish_status
      }))
    });
    
    // Also try a direct query to see if data exists
    if (projects.length === 0 && user) {
      console.log('⚠️ No projects from context, trying direct query...');
      supabase
        .from('project_templates_live')
        .select('id, name, publish_status, is_current_version')
        .limit(10)
        .then(({ data, error }) => {
          console.log('🔍 Direct query result:', { dataCount: data?.length || 0, error, sample: data?.[0] });
        });
    }
  }, [projects, publicProjects, user, isAdminMode]);

  // Filter projects to show published and beta projects or all projects in admin mode
  const publishedProjects = useMemo(() => {
    const filtered = user 
      ? projects.filter(project => {
          const publishStatus = project.publishStatus || (project as any).publish_status;
          const isCurrentVersion = (project as any).is_current_version !== false; // Default to true if not specified
          
          const isValidStatus = (
            publishStatus === 'published' || 
            publishStatus === 'beta-testing' || 
            isAdminMode
          );
          const isNotManualTemplate = project.id !== '00000000-0000-0000-0000-000000000000';
          const isNotStandardFoundation = project.id !== '00000000-0000-0000-0000-000000000001';
          
          // Include if: (published/beta OR admin mode) AND not manual template AND not standard foundation AND is current version
          const shouldInclude = isValidStatus && isNotManualTemplate && isNotStandardFoundation && isCurrentVersion;
          
          if (!shouldInclude) {
            console.log('🚫 Filtered out project:', {
              name: project.name,
              publishStatus,
              isCurrentVersion,
              isAdminMode,
              isNotManualTemplate,
              isNotStandardFoundation
            });
          }
          
          return shouldInclude;
        })
      : publicProjects.filter(project => 
          project.id !== '00000000-0000-0000-0000-000000000000' && // Hide manual project template
          project.id !== '00000000-0000-0000-0000-000000000001' // Hide standard foundation
        );
    
    console.log('✅ publishedProjects:', {
      count: filtered.length,
      projects: filtered.map(p => ({ 
        name: p.name, 
        publishStatus: p.publishStatus || (p as any).publish_status,
        isCurrentVersion: (p as any).is_current_version 
      }))
    });
    
    return filtered;
  }, [projects, user, isAdminMode, publicProjects]);

  // Get unique filter options
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    publishedProjects.forEach(p => {
      if (Array.isArray(p.category)) {
        p.category.forEach(cat => cat && categories.add(cat));
      } else if (typeof p.category === 'string' && p.category.trim()) {
        categories.add(p.category);
      }
    });
    return Array.from(categories).sort();
  }, [publishedProjects]);
  
  const availableDifficulties = useMemo(() => 
    ['Beginner', 'Intermediate', 'Advanced'],
    []
  );
  
  const availableEffortLevels = useMemo(() => 
    ['Low', 'Medium', 'High'],
    []
  );

  // Filtered projects based on search and filters
  const filteredProjects = useMemo(() => {
    return publishedProjects.filter(project => {
      // Search filter
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(project.category)
          ? project.category.some(cat => cat?.toLowerCase().includes(searchTerm.toLowerCase()))
          : project.category?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter
      const projectCategories = Array.isArray(project.category) ? project.category : (project.category ? [project.category] : []);
      const matchesCategory = selectedCategories.length === 0 || 
        (projectCategories.length > 0 && projectCategories.some(cat => selectedCategories.includes(cat)));

      // Difficulty filter
      const matchesDifficulty = selectedDifficulties.length === 0 || 
        (project.difficulty && selectedDifficulties.includes(project.difficulty));

      // Effort level filter
      const matchesEffortLevel = selectedEffortLevels.length === 0 || 
        (project.effortLevel && selectedEffortLevels.includes(project.effortLevel));

      // Project type filter
      const projectTypeValue = getProjectTypeValue(project);
      const matchesProjectType = projectTypeFilter === 'all' || projectTypeValue === projectTypeFilter;

      return matchesSearch && matchesCategory && matchesDifficulty && matchesEffortLevel && matchesProjectType;
    });
  }, [publishedProjects, searchTerm, selectedCategories, selectedDifficulties, selectedEffortLevels, projectTypeFilter, getProjectTypeValue]);

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
    setProjectTypeFilter('all');
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
      await proceedToNewProject(project);
      
    } catch (error) {
      console.error('❌ Error in handleSelectProject:', error);
      setIsCreatingNewProject(false); // Reset flag on error
      alert(`Failed to start project: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      projectChallenges: selectedTemplate.projectChallenges
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
  const proceedToNewProject = async (template?: any) => {
    const projectTemplate = template || selectedTemplate;
    if (!projectTemplate) {
      console.error('❌ proceedToNewProject: No template provided');
      return;
    }

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

    try {
      // Create a new project RUN based on the template without setup info
      const newProjectRun = {
        templateId: projectTemplate.id,
        name: projectTemplate.name,
        description: projectTemplate.description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(),
        planEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'not-started' as const,
        // No user customization data when skipping
        completedSteps: [],
        progress: 0,
        // Copy template data
        phases: projectTemplate.phases || [],
        category: projectTemplate.category,
        effortLevel: projectTemplate.effortLevel,
        skillLevel: projectTemplate.skillLevel,
        estimatedTime: projectTemplate.estimatedTime,
        diyLengthChallenges: projectTemplate.diyLengthChallenges
      };
      
      console.log('📦 Created project run data:', {
        templateId: newProjectRun.templateId,
        name: newProjectRun.name,
        hasPhases: !!newProjectRun.phases && Array.isArray(newProjectRun.phases)
      });
      
      // Set timeout to reset flag if creation doesn't complete
      const resetTimeout = setTimeout(() => {
        console.log('⏱️ Project creation timeout - resetting flag');
        setIsCreatingNewProject(false);
      }, 10000); // Increased timeout to 10 seconds
      
      // Pass navigation callback to addProjectRun
      await addProjectRun(newProjectRun, (projectRunId: string) => {
        clearTimeout(resetTimeout);
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
      }).catch((error) => {
        // Handle error from addProjectRun
        clearTimeout(resetTimeout);
        console.error('❌ Error in addProjectRun:', error);
        setIsCreatingNewProject(false);
        // Show error to user
        alert(`Failed to start project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });
    } catch (error) {
      console.error('❌ Error in proceedToNewProject:', error);
      setIsCreatingNewProject(false);
      alert(`Failed to start project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      projectChallenges: selectedTemplate.projectChallenges
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
                onClick={() => {
                  console.log('ProjectCatalog: Go To My Workspace button clicked (desktop)');
                  navigate('/'); // Navigate to home/workspace
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go To My Workspace
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
            onClick={() => {
              console.log('📱 ProjectCatalog: Close button clicked');
              if (onClose) {
                console.log('📱 ProjectCatalog: Using onClose callback');
                onClose();
              } else {
                console.log('📱 ProjectCatalog: Using navigate(-1) fallback');
                navigate(-1);
              }
            }}
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
              <div className="flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs relative">
                      <Filter className="w-3 h-3 mr-1" />
                      Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52">
                    <FilterMenuHeader label="Category" description={FILTER_DESCRIPTIONS.category} />
                    {availableCategories.map((category) => (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Skill Level Filter */}
              <div className="flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs relative">
                      <Filter className="w-3 h-3 mr-1" />
                      Skill {selectedDifficulties.length > 0 && `(${selectedDifficulties.length})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52">
                    <FilterMenuHeader label="Skill Level" description={FILTER_DESCRIPTIONS.skill} />
                    {availableDifficulties.map((difficulty) => (
                      <DropdownMenuCheckboxItem
                        key={difficulty}
                        checked={selectedDifficulties.includes(difficulty)}
                        onCheckedChange={() => handleDifficultyToggle(difficulty)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {difficulty}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Effort Level Filter */}
              <div className="flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs relative">
                      <Filter className="w-3 h-3 mr-1" />
                      Effort {selectedEffortLevels.length > 0 && `(${selectedEffortLevels.length})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52">
                    <FilterMenuHeader label="Effort Level" description={FILTER_DESCRIPTIONS.effort} />
                    {availableEffortLevels.map((effortLevel) => (
                      <DropdownMenuCheckboxItem
                        key={effortLevel}
                        checked={selectedEffortLevels.includes(effortLevel)}
                        onCheckedChange={() => handleEffortLevelToggle(effortLevel)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {effortLevel}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Project Type Filter */}
              <div className="flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full text-xs relative">
                      <Filter className="w-3 h-3 mr-1" />
                      Project Type {projectTypeLabel && `(${projectTypeLabel})`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52 space-y-1">
                    <FilterMenuHeader label="Project Type" description={FILTER_DESCRIPTIONS.projectType} />
                    <DropdownMenuRadioGroup value={projectTypeFilter} onValueChange={(value) => setProjectTypeFilter(value as 'all' | 'primary' | 'secondary')}>
                      <DropdownMenuRadioItem value="all">All project types</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="primary">Primary</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="secondary">Secondary</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Project Type Filter */}
           

            {/* Clear Filters */}
            {(searchTerm || selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0 || projectTypeFilter !== 'all') && (
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
              <div className="w-full lg:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full lg:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <FilterMenuHeader label="Category" description={FILTER_DESCRIPTIONS.category} />
                    {availableCategories.map((category) => (
                      <DropdownMenuCheckboxItem
                        key={category}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {category}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Skill Level Filter */}
              <div className="w-full lg:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full lg:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Skill Level {selectedDifficulties.length > 0 && `(${selectedDifficulties.length})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <FilterMenuHeader label="Skill Level" description={FILTER_DESCRIPTIONS.skill} />
                    {availableDifficulties.map((difficulty) => (
                      <DropdownMenuCheckboxItem
                        key={difficulty}
                        checked={selectedDifficulties.includes(difficulty)}
                        onCheckedChange={() => handleDifficultyToggle(difficulty)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {difficulty}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Effort Level Filter */}
              <div className="w-full lg:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full lg:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Effort Level {selectedEffortLevels.length > 0 && `(${selectedEffortLevels.length})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <FilterMenuHeader label="Effort Level" description={FILTER_DESCRIPTIONS.effort} />
                    {availableEffortLevels.map((effortLevel) => (
                      <DropdownMenuCheckboxItem
                        key={effortLevel}
                        checked={selectedEffortLevels.includes(effortLevel)}
                        onCheckedChange={() => handleEffortLevelToggle(effortLevel)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {effortLevel}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Project Type Filter */}
              <div className="w-full lg:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full lg:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Project Type {projectTypeLabel && `(${projectTypeLabel})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 space-y-1">
                    <FilterMenuHeader label="Project Type" description={FILTER_DESCRIPTIONS.projectType} />
                    <DropdownMenuRadioGroup value={projectTypeFilter} onValueChange={(value) => setProjectTypeFilter(value as 'all' | 'primary' | 'secondary')}>
                      <DropdownMenuRadioItem value="all">All project types</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="primary">Primary</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="secondary">Secondary</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Clear Filters */}
              {(searchTerm || selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0 || projectTypeFilter !== 'all') && (
                <Button variant="ghost" onClick={clearAllFilters} className="text-muted-foreground">
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Active filters display */}
          {(selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0 || projectTypeFilter !== 'all') && (
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
              {projectTypeFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {projectTypeFilter === 'primary' ? 'Primary project' : 'Secondary project'}
                  <button
                    onClick={() => setProjectTypeFilter('all')}
                    className="ml-1 text-xs hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
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