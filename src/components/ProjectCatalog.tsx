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
import { supabase } from '@/integrations/supabase/client';
import DIYSurveyPopup from '@/components/DIYSurveyPopup';
import ProfileManager from '@/components/ProfileManager';
import { HomeManager } from '@/components/HomeManager';
import { HomeTaskList } from '@/components/HomeTaskList';
import { BetaProjectWarning } from '@/components/BetaProjectWarning';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { isKickoffPhaseComplete } from '@/utils/projectUtils';
import { filterProjectsForCatalog } from '@/utils/catalogProjectFilters';
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
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [comingSoonProject, setComingSoonProject] = useState<Project | null>(null);
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
  const [showAllProjects, setShowAllProjects] = useState(false);
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
      setShowAllProjects(true);
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
        .in('publish_status', ['published', 'beta-testing'])
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .neq('id', '00000000-0000-0000-0000-000000000001')
        .order('updated_at', { ascending: false });

      if (data && !error) {
        setPublicProjects(data);
      } else if (error) {
        console.error('❌ Error fetching public projects:', error);
      }
      };
      
      fetchPublicProjects();
    } else if (user && !isAdminMode) {
      fetchProjects();
    }
  }, [user, isAdminMode, fetchProjects]);

  // Use appropriate projects based on authentication status
  const availableProjects = user ? projects : publicProjects;

  // Filter projects to show published, beta, and coming-soon projects or all projects in admin mode
  const publishedProjects = useMemo(() => {
    if (user) {
      return filterProjectsForCatalog(projects, isAdminMode);
    }

    const filteredFromDb = publicProjects.filter((project) => {
      const visibility =
        (project as any).visibilityStatus ??
        (project as any).visibility_status ??
        'default';

      const isHidden = visibility === 'hidden';
      const isNotManualTemplate = project.id !== '00000000-0000-0000-0000-000000000000';

      const isStandardByFlag = !!(project as any).is_standard;
      const isStandardById = project.id === '00000000-0000-0000-0000-000000000001';
      const isStandardByName =
        typeof (project as any).name === 'string' &&
        (project as any).name.trim().toLowerCase() === 'standard project foundation';

      const isNotStandardFoundation = !(isStandardByFlag || isStandardById || isStandardByName);

      return !isHidden && isNotManualTemplate && isNotStandardFoundation;
    });

    let finalProjects = filteredFromDb;

    if (!isAdminMode) {
      const byFamily = new Map<string, any>();
      for (const project of filteredFromDb) {
        const rootId =
          (project as any).parent_project_id ||
          (project as any).parentProjectId ||
          project.id;
        const revisionNumber =
          (project as any).revision_number ??
          (project as any).revisionNumber ??
          0;
        const existing = byFamily.get(rootId);
        if (!existing) {
          byFamily.set(rootId, project);
        } else {
          const existingRev =
            (existing as any).revision_number ??
            (existing as any).revisionNumber ??
            0;
          if (revisionNumber > existingRev) {
            byFamily.set(rootId, project);
          }
        }
      }
      finalProjects = Array.from(byFamily.values());
    }

    return [...finalProjects].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

  // Popular projects for carousel (published and marked is_popular); show only when grid is collapsed
  const popularProjects = useMemo(() => {
    return publishedProjects.filter(
      project => (project as Project).isPopular === true || (project as any).is_popular === true
    );
  }, [publishedProjects]);

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
    setShowAllProjects(false);
  };

  // Check if there are active filters or search
  const hasActiveFilters = useMemo(() => {
    return searchTerm.trim() !== '' || 
           selectedCategories.length > 0 || 
           selectedDifficulties.length > 0 || 
           selectedEffortLevels.length > 0 || 
           projectTypeFilter !== 'all';
  }, [searchTerm, selectedCategories, selectedDifficulties, selectedEffortLevels, projectTypeFilter]);

  // Determine if grid should be shown
  const shouldShowGrid = hasActiveFilters || showAllProjects;
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
      if (!project) {
        console.error('❌ No project provided to handleSelectProject');
        return;
      }

      const visibility = ((project as any).visibility_status ?? (project as any).visibilityStatus ?? 'default') as 'default' | 'coming-soon' | 'hidden';
      if (visibility === 'coming-soon') {
        setComingSoonProject(project);
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

      if (!user) {
        navigate('/auth?return=projects');
        return;
      }

      // Extra guard: only allow starting published or beta projects from catalog (coming-soon already handled above)
      const effectivePublishStatus = project.publishStatus || (project as any).publish_status;
      if (effectivePublishStatus !== 'published' && effectivePublishStatus !== 'beta-testing') {
        console.warn('Blocked attempt to start non-published/beta project from catalog:', {
          name: project.name,
          publishStatus: effectivePublishStatus,
          visibility,
        });
        setComingSoonProject(project);
        return;
      }

      // Check if project is beta and show warning first
      if (project.publishStatus === 'beta-testing') {
        setSelectedTemplate(project);
        setIsBetaWarningOpen(true);
        return;
      }

      setSelectedTemplate(project);
      await proceedToNewProject(project);
      
    } catch (error) {
      console.error('❌ Error in handleSelectProject:', error);
      setIsCreatingNewProject(false); // Reset flag on error
      alert(`Failed to start project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDIYSurveyComplete = (surveyCompleted: boolean = true) => {
    setIsDIYSurveyOpen(false);
    if (surveyCompleted) {
      proceedToWorkflow();
    } else {
      resetProjectState();
    }
  };

  const handleProfileManagerComplete = () => {
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
      category: Array.isArray(selectedTemplate.category) ? selectedTemplate.category : (selectedTemplate.category ? [selectedTemplate.category] : []),
      effortLevel: selectedTemplate.effortLevel,
      skillLevel: selectedTemplate.skillLevel,
      estimatedTime: selectedTemplate.estimatedTime,
      projectChallenges: selectedTemplate.projectChallenges
    };
    
    // Pass navigation callback to addProjectRun
    addProjectRun(newProjectRun, (projectRunId: string) => {
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
        .select('id, name, is_primary')
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
      return;
    }
    
    if (!selectedTemplate || !user) return;

    // Close project setup dialog
    setIsProjectSetupOpen(false);

    // Check user profile to determine next step
    try {
      const { data, error } = await supabase
        .from('user_profiles')
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

    // Hard block starting "coming-soon" templates in user mode
    if (!isAdminMode) {
      const visibility =
        (projectTemplate as any).visibility_status ??
        (projectTemplate as any).visibilityStatus ??
        'default';
      if (visibility === 'coming-soon') {
        setComingSoonProject(projectTemplate);
        console.warn('Blocked attempt to start coming-soon template in proceedToNewProject:', {
          name: projectTemplate.name,
          visibility,
        });
        return;
      }
    }

    if (isCreatingNewProject) {
      return;
    }
    setIsCreatingNewProject(true);
    
    // Explicitly close ALL dialogs before proceeding - this is critical
    setIsProjectSetupOpen(false);
    setIsDIYSurveyOpen(false);
    setIsProfileManagerOpen(false);
    setIsBetaWarningOpen(false);

    try {
      // Ensure template has phases - use compiled workflow (standard foundation + custom phases) when missing
      let templatePhases = projectTemplate.phases || [];

      if (!templatePhases || !Array.isArray(templatePhases) || templatePhases.length === 0) {
        // Use get_project_workflow_with_standards so we get standard phases + custom phases (same as create_project_run_snapshot).
        // rebuild_phases_json_from_project_phases only returns custom project_phases for this project, so templates that use
        // only standard (foundation) phases would get 0 phases and fail.
        const { data: workflowPhases, error: workflowError } = await (supabase.rpc as any)(
          'get_project_workflow_with_standards',
          { p_project_id: projectTemplate.id }
        );

        if (workflowError) {
          throw new Error(
            `Failed to load workflow for template "${projectTemplate.name}": ${workflowError.message}. ` +
            'Ensure the project has phases (standard foundation and/or custom) or add phases in admin.'
          );
        }

        let normalized: any[] = [];
        if (workflowPhases != null) {
          if (Array.isArray(workflowPhases)) {
            normalized = workflowPhases;
          } else if (typeof workflowPhases === 'string') {
            try {
              const parsed = JSON.parse(workflowPhases);
              normalized = Array.isArray(parsed) ? parsed : [];
            } catch {
              normalized = [];
            }
          } else if (typeof workflowPhases === 'object' && Array.isArray((workflowPhases as any).phases)) {
            normalized = (workflowPhases as any).phases;
          }
        }
        // Use workflowPhases from the database when available. If none are returned,
        // defer to create_project_run_snapshot_v2 to assemble phases from the
        // canonical project_phases / phase_operations / operation_steps tables.
        templatePhases = normalized;
        if (templatePhases.length > 0) {
          await supabase.from('projects').update({ phases: templatePhases }).eq('id', projectTemplate.id);
        }
      }
      
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
        // phases are assembled in the database snapshot; this client copy is only advisory
        phases: templatePhases || [],
        category: projectTemplate.category,
        effortLevel: projectTemplate.effortLevel,
        skillLevel: projectTemplate.skillLevel,
        estimatedTime: projectTemplate.estimatedTime,
        diyLengthChallenges: projectTemplate.diyLengthChallenges
      };
      
      const resetTimeout = setTimeout(() => {
        setIsCreatingNewProject(false);
      }, 10000);
      
      // Pass navigation callback to addProjectRun
      await addProjectRun(newProjectRun, (projectRunId: string) => {
        clearTimeout(resetTimeout);

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
      category: Array.isArray(selectedTemplate.category) ? selectedTemplate.category : (selectedTemplate.category ? [selectedTemplate.category] : []),
      effortLevel: selectedTemplate.effortLevel,
      skillLevel: selectedTemplate.skillLevel,
      estimatedTime: selectedTemplate.estimatedTime,
      projectChallenges: selectedTemplate.projectChallenges
    };
    
    // Pass navigation callback to addProjectRun
    addProjectRun(newProjectRun, (projectRunId: string) => {
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
    
    // CRITICAL: Check if template has phases - if it does, skip setup window and proceed directly
    const hasPhases = selectedTemplate.phases && 
                      Array.isArray(selectedTemplate.phases) && 
                      selectedTemplate.phases.length > 0;
    
    if (hasPhases) {
      proceedToNewProject(selectedTemplate);
      return;
    }
    
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
      const kickoffComplete = isKickoffPhaseComplete(existingRun.completedSteps || []);
      
      // Only show project setup dialog if kickoff is complete AND template doesn't have phases
      // (But we already checked above, so this should never happen for templates with phases)
      if (kickoffComplete && !hasPhases) {
        setIsProjectSetupOpen(true);
      } else {
        navigate('/', {
          state: {
            view: 'user',
            projectRunId: existingRun.id
          }
        });
      }
    } else {
      // New project run - if no phases, show setup window; otherwise proceed directly
      if (!hasPhases) {
        setIsProjectSetupOpen(true);
      } else {
        proceedToNewProject(selectedTemplate);
      }
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-y-auto">
      <div className="container mx-auto min-h-screen px-4 pt-3 pb-5 md:px-6 md:py-8 md:pb-8">
            <div className="hidden md:flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/');
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to My Workshop
              </Button>
            </div>

        {/* Mobile: workshop link top-left, minimal vertical space */}
        <div className="md:hidden mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                navigate('/');
              }
            }}
            className="h-8 -ml-2 px-2 text-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Go to My Workshop
          </Button>
        </div>

        <div className="text-center mb-4 md:mb-8 md:pt-1 md:pb-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 md:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 leading-[1.35]">
            <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent inline-block pb-1 pt-0.5">
              Project Catalog
            </span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-normal px-1">Select a project to get started</p>
        </div>

        {/* Filters Header Bar */}
        <div className="bg-card border rounded-lg p-3 mb-4 space-y-3 md:p-6 md:mb-8 md:space-y-4">
          {/* Mobile: Compact filter layout */}
          <div className="md:hidden space-y-2">
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

            {/* Mobile: category filter only (skill / effort / type on md+ below) */}
            <div className="w-full">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-7 px-2 relative">
                    <Filter className="w-2.5 h-2.5 mr-0.5" />
                    <span className="truncate">Category{selectedCategories.length > 0 && ` (${selectedCategories.length})`}</span>
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

            {/* Clear Filters */}
            {(searchTerm || selectedCategories.length > 0 || selectedDifficulties.length > 0 || selectedEffortLevels.length > 0 || projectTypeFilter !== 'all') && (
              <Button variant="ghost" onClick={clearAllFilters} className="text-muted-foreground text-xs" size="sm">
                Clear All
              </Button>
            )}
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden md:block">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
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
              <div className="w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto justify-between relative">
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
              <div className="w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Skill {selectedDifficulties.length > 0 && `(${selectedDifficulties.length})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <FilterMenuHeader label="Skill" description={FILTER_DESCRIPTIONS.skill} />
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
              <div className="w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Effort {selectedEffortLevels.length > 0 && `(${selectedEffortLevels.length})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <FilterMenuHeader label="Effort" description={FILTER_DESCRIPTIONS.effort} />
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
              <div className="w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto justify-between relative">
                      <span className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Type {projectTypeLabel && `(${projectTypeLabel})`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 space-y-1">
                    <FilterMenuHeader label="Type" description={FILTER_DESCRIPTIONS.projectType} />
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

        {/* Popular projects carousel - under search/filters, above Show all Projects; hidden when "Show all projects" is expanded */}
        {!shouldShowGrid && popularProjects.length > 0 && (
          <div className="mb-4 md:mb-8">
            <h2 className="text-lg font-semibold mb-2 md:mb-4">Popular projects</h2>
            <Carousel
              opts={{ align: 'start', loop: false }}
              className="w-full px-11 sm:px-12 md:px-14"
            >
              <CarouselContent className="-ml-2 md:-ml-3">
                {popularProjects.map((project) => {
                  const projectCategories = Array.isArray(project.category) ? project.category : (project.category ? [project.category] : []);
                  const IconComponent = getIconForCategory(projectCategories[0] || '');
                  const imageUrl = (project as any).cover_image || project.image || (project as any).images?.[0];
                  return (
                    <CarouselItem key={project.id} className="pl-2 md:pl-3 basis-[140px] sm:basis-[160px] md:basis-[180px]">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectProject(project);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectProject(project);
                          }
                        }}
                        className="group rounded-lg border bg-card overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ aspectRatio: '4/3' }}
                      >
                        <div className="relative w-full h-full min-h-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={project.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                              <IconComponent className="w-8 h-8 text-white/90" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                            <h3 className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                              {project.name}
                            </h3>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious
                variant="default"
                className="left-1 sm:left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 border-0 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-40"
              />
              <CarouselNext
                variant="default"
                className="right-1 sm:right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 border-0 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-40"
              />
            </Carousel>
          </div>
        )}

        {/* Show All Projects Button - Only show when grid is hidden */}
        {!shouldShowGrid && (
          <div className="mb-6 flex flex-col items-center gap-4 md:mb-10 md:gap-8">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllProjects(true)}
              className="text-xs"
            >
              Show all Projects
            </Button>
          </div>
        )}

        {/* Slim CTA: To run multiple projects, use Project & Task Manager - only when grid is visible */}
        {shouldShowGrid && !isAdminMode && (
          <div className="flex items-center justify-center gap-1.5 py-2 px-3 mb-2 rounded-md bg-muted/40 border border-border/50">
            <span className="text-xs text-muted-foreground">To run multiple projects, use</span>
            <button
              type="button"
              onClick={() => setTaskManagerOpen(true)}
              className="text-xs font-medium text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              Project & Task Manager
            </button>
          </div>
        )}

        {/* Results Summary - Only show when grid is visible */}
        {shouldShowGrid && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing {filteredProjects.length} of {publishedProjects.length} projects
            </div>
            {!hasActiveFilters && showAllProjects && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAllProjects(false)}
                className="text-xs h-7"
              >
                Hide Projects
              </Button>
            )}
          </div>
        )}

        {/* Full list: compact rows below lg; photo cards in grid from lg up */}
        {shouldShowGrid && (
          <div className="space-y-2 lg:grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-4 lg:space-y-0">
          {filteredProjects.length === 0 ? (
            <div className="lg:col-span-full text-center py-12">
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
              const projectCategories = Array.isArray(project.category) ? project.category : (project.category ? [project.category] : []);
              const IconComponent = getIconForCategory(projectCategories[0] || '');
              const imageUrl = (project as any).cover_image || project.image || (project as any).images?.[0];
              
              return (
                <div key={project.id}>
                  {/* Compact row: phones & tablets below lg (no tall photo cards) */}
                  <div 
                    className="lg:hidden group hover:bg-muted/40 transition-colors cursor-pointer border rounded-lg bg-card overflow-hidden h-16" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        handleSelectProject(project);
                      } catch (error) {
                        console.error('❌ Error in handleSelectProject:', error);
                      }
                    }}
                  >
                    <div className="flex items-stretch h-full min-h-0">
                      <div className="flex-shrink-0 w-14 h-16 self-stretch overflow-hidden bg-muted">
                        {((project as any).cover_image || project.image || (project as any).images?.[0]) ? (
                          <img 
                            src={(project as any).cover_image || project.image || (project as any).images?.[0]} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 px-3 py-1.5 flex flex-col justify-center gap-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors min-w-0 flex-1">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            {project.publishStatus === 'beta-testing' && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px] px-1 py-0">
                                BETA
                              </Badge>
                            )}
                            {(project as any).visibility_status === 'coming-soon' && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] px-1 py-0">
                                Soon
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {(project as any).difficulty || 'Beginner'}
                          {project.estimatedTime ? ` · ${project.estimatedTime}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Large photo cards: lg breakpoint and up (no inline display — it overrides Tailwind `hidden` on small screens) */}
                  <div 
                    className="hidden lg:flex lg:flex-col lg:h-full lg:aspect-[4/3] group hover:shadow-xl transition-all duration-300 cursor-pointer rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        handleSelectProject(project);
                      } catch (error) {
                        console.error('❌ Error in handleSelectProject:', error);
                      }
                    }}
                  >
                    {/* Project Name Header - Fixed at top */}
                    <div className="flex-shrink-0 px-4 pt-3 pb-2 bg-card border-b border-border">
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2 text-center">
                        {project.name}
                      </h3>
                    </div>

                    {/* Cover Image or Gradient - Takes remaining space */}
                    <div 
                      className="flex-1 relative overflow-hidden bg-muted"
                      style={{ 
                        minHeight: 0,
                        position: 'relative'
                      }}
                    >
                      {/* Gradient background - always present, shows when no image or image fails */}
                      <div 
                        className="gradient-background absolute inset-0 bg-gradient-to-br from-primary to-orange-500"
                        style={{
                          opacity: imageUrl ? 0 : 1,
                          transition: 'opacity 0.3s ease',
                          zIndex: 1
                        }}
                      >
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <IconComponent className="w-8 h-8 text-white/80" />
                        </div>
                      </div>
                      
                      {/* Image - if available */}
                      {imageUrl && (
                        <img 
                          src={imageUrl} 
                          alt={project.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          style={{ 
                            zIndex: 2,
                            display: 'block'
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            // Show the gradient background
                            const gradientDiv = img.parentElement?.querySelector('.gradient-background') as HTMLElement;
                            if (gradientDiv) {
                              gradientDiv.style.opacity = '1';
                            }
                          }}
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement;
                            const gradientDiv = img.parentElement?.querySelector('.gradient-background') as HTMLElement;
                            if (gradientDiv) {
                              gradientDiv.style.opacity = '0';
                            }
                            // Ensure image is visible
                            img.style.display = 'block';
                            img.style.zIndex = '2';
                          }}
                        />
                      )}
                      
                      {/* Overlay gradient for text readability - only if image exists */}
                      {imageUrl && (
                        <div 
                          className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" 
                          style={{ zIndex: 3 }} 
                        />
                      )}
                      
                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex gap-1" style={{ zIndex: 4 }}>
                        {project.publishStatus === 'beta-testing' && (
                          <Badge variant="secondary" className="bg-orange-500/20 text-orange-200 border-orange-300/30 backdrop-blur-sm text-[10px] px-1.5 py-0">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            BETA
                          </Badge>
                        )}
                        {(project as any).visibility_status === 'coming-soon' && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-300/30 backdrop-blur-sm text-[10px] px-1.5 py-0">
                            Coming Soon
                          </Badge>
                        )}
                        {isAdminMode && (
                          <Badge
                            variant="secondary"
                            className={`${
                              project.publishStatus === 'published'
                                ? 'bg-green-500/20 text-green-300'
                                : project.publishStatus === 'beta-testing'
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            } backdrop-blur-sm text-[10px] px-1.5 py-0`}
                          >
                            {project.publishStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Button removed: cards themselves handle project selection */}
                  </div>
                </div>
              );
            })
          )}
          </div>
        )}

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

        {/* Coming Soon dialog - unified for all coming-soon projects */}
        {!isAdminMode && comingSoonProject && (
          <Dialog open={!!comingSoonProject} onOpenChange={(open) => !open && setComingSoonProject(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">Coming Soon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="font-medium text-foreground">{comingSoonProject.name}</h3>
                  {comingSoonProject.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {comingSoonProject.description}
                    </p>
                  )}
                </div>
                <p className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  <span className="text-muted-foreground">Release date:</span>
                  <span className="font-medium text-foreground">
                    {comingSoonProject.release_date
                      ? new Date(comingSoonProject.release_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'TBD'}
                  </span>
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setComingSoonProject(null)}>
                  Got it
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* DIY Survey Dialog - Only show in user mode */}
        {!isAdminMode && (
          <DIYSurveyPopup 
            open={isDIYSurveyOpen} 
            onOpenChange={(open) => {
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

        {/* Project & Task Manager (opened from Project Catalog) */}
        {!isAdminMode && (
          <HomeTaskList open={taskManagerOpen} onOpenChange={setTaskManagerOpen} />
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