import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useProjectData } from './ProjectDataContext';
import { useGuest } from './GuestContext';
import { toast } from '@/components/ui/use-toast';
import { ensureStandardPhasesForNewProject } from '@/utils/projectUtils';
import { useOptimizedState } from '@/hooks/useOptimizedState';


interface ProjectActionsContextType {
  currentProject: Project | null;
  currentProjectRun: ProjectRun | null;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectRun: (projectRun: ProjectRun | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  createProjectRun: (project: Project, customName?: string, homeId?: string) => Promise<string | null>;
  addProjectRun: (projectRun: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>, onSuccess?: (projectRunId: string) => void) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  updateProjectRun: (projectRun: ProjectRun) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteProjectRun: (projectRunId: string) => Promise<void>;
}

const ProjectActionsContext = createContext<ProjectActionsContextType | undefined>(undefined);

export const useProjectActions = () => {
  const context = useContext(ProjectActionsContext);
  if (context === undefined) {
    throw new Error('useProjectActions must be used within a ProjectActionsProvider');
  }
  return context;
};

interface ProjectActionsProviderProps {
  children: ReactNode;
}

export const ProjectActionsProvider: React.FC<ProjectActionsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { refetchProjects, refetchProjectRuns, updateProjectsCache, updateProjectRunsCache, projects, projectRuns } = useProjectData();
  const { isGuest, addGuestProjectRun, updateGuestProjectRun, deleteGuestProjectRun } = useGuest();
  
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectRun, setCurrentProjectRun] = useState<ProjectRun | null>(null);

  // Refs to track update state and implement debouncing
  const updateInProgressRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>('');

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.log('🚀 addProject CALLED:', {
      projectName: projectData.name,
      hasUser: !!user,
      isAdmin,
      timestamp: new Date().toISOString()
    });
    
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can create projects",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use database function to create project with proper template architecture
      const { data: projectId, error } = await supabase
        .rpc('create_project_with_standard_foundation', {
          p_project_name: projectData.name,
          p_description: projectData.description || null,
          p_categories: projectData.category || null,
          p_difficulty: null,
          p_effort_level: projectData.effortLevel || null,
          p_skill_level: projectData.skillLevel || null,
          p_estimated_time: projectData.estimatedTime || null,
          p_scaling_unit: projectData.scalingUnit || null,
          p_diy_length_challenges: projectData.diyLengthChallenges || null,
          p_image: projectData.image || null
        });

      if (error) throw error;

      // Update the created project with additional fields not in RPC
      if (projectId) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            skill_level: projectData.skillLevel || null,
            scaling_unit: projectData.scalingUnit || null,
            diy_length_challenges: projectData.diyLengthChallenges || null,
            estimated_time_per_unit: projectData.estimatedTimePerUnit || null
          })
          .eq('id', projectId);

        if (updateError) {
          console.error('Error updating additional project fields:', updateError);
        }
      }

      if (error) throw error;

      console.log('✅ Project created with standard foundation:', projectId);

      await refetchProjects();
      toast({
        title: "Success",
        description: "Project created successfully with standard foundation",
      });
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, refetchProjects]);

  const createProjectRun = useCallback(async (project: Project, customName?: string, homeId?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // ensureStandardPhasesForNewProject preserves existing phases (including apps)
      // and only adds missing standard phases. This ensures apps defined in the
      // template project are copied to the new project run.
      const phasesWithStandard = ensureStandardPhasesForNewProject(project.phases);
      
      const { data, error } = await supabase
        .from('project_runs')
        .insert({
          template_id: project.id,
          user_id: user.id,
          home_id: homeId || null,
          name: project.name,
          description: project.description,
          diy_length_challenges: project.diyLengthChallenges,
          start_date: new Date().toISOString(),
          plan_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'not-started',
          custom_project_name: customName,
          completed_steps: JSON.stringify([]),
          progress: 0,
          phases: JSON.stringify(phasesWithStandard),
          category: Array.isArray(project.category) ? project.category.join(', ') : project.category,
          effort_level: project.effortLevel,
          skill_level: project.skillLevel,
          estimated_time: project.estimatedTime
        })
        .select()
        .single();

      if (error) throw error;

      await refetchProjectRuns();
      return data?.id || null;
    } catch (error) {
      console.error('Error creating project run:', error);
      toast({
        title: "Error",
        description: "Failed to create project run",
        variant: "destructive",
      });
      return null;
    }
  }, [user, refetchProjectRuns]);

  const addProjectRun = useCallback(async (
    projectRunData: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>, 
    onSuccess?: (projectRunId: string) => void
  ) => {
    if (isGuest) {
      // Handle guest mode
      addGuestProjectRun(projectRunData);
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (onSuccess) {
        onSuccess(guestId);
      }
      toast({
        title: "Success",
        description: "Project run saved temporarily (sign up to keep permanently)"
      });
      return;
    }

    if (!user) return;

    try {
      // Use new RPC function to create immutable project run snapshot
      const { data: newProjectRunId, error } = await supabase
        .rpc('create_project_run_snapshot', {
          p_template_id: projectRunData.templateId,
          p_user_id: user.id,
          p_run_name: projectRunData.name,
          p_home_id: null, // Will be added later
          p_start_date: projectRunData.startDate.toISOString(),
          p_plan_end_date: projectRunData.planEndDate.toISOString()
        });

      if (error) throw error;

      // Refetch to get the complete project run data
      await refetchProjectRuns();
      
      // Call success callback with the new ID
      if (newProjectRunId && onSuccess) {
        console.log("🎯 ProjectActions: Project run created with ID:", newProjectRunId);
        onSuccess(newProjectRunId);
      } else if (newProjectRunId) {
        console.log("🎯 ProjectActions: Dispatching navigation event for Index.tsx");
        window.dispatchEvent(new CustomEvent('navigate-to-kickoff', { 
          detail: { projectRunId: newProjectRunId } 
        }));
      }
    } catch (error) {
      console.error('Error adding project run:', error);
      toast({
        title: "Error",
        description: "Failed to add project run",
        variant: "destructive",
      });
    }
  }, [isGuest, addGuestProjectRun, user, refetchProjectRuns]);

  const updateProject = useCallback(async (project: Project) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can update projects",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          diy_length_challenges: project.diyLengthChallenges || null,
          image: project.image,
          start_date: project.startDate.toISOString(),
          plan_end_date: project.planEndDate.toISOString(),
          end_date: project.endDate?.toISOString(),
          status: project.status,
          publish_status: project.publishStatus,
          category: project.category || null,
          effort_level: project.effortLevel || null,
          skill_level: project.skillLevel || null,
          estimated_time: project.estimatedTime || null,
          estimated_time_per_unit: project.estimatedTimePerUnit || null,
          scaling_unit: project.scalingUnit || null,
          phases: JSON.stringify(project.phases)
        })
        .eq('id', project.id);

      if (error) throw error;

      // Optimistically update cache
      const updatedProjects = projects.map(p => p.id === project.id ? project : p);
      updateProjectsCache(updatedProjects);
      
      if (currentProject?.id === project.id) {
        setCurrentProject(project);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, projects, updateProjectsCache, currentProject, setCurrentProject]);

  const updateProjectRun = useCallback(async (projectRun: ProjectRun) => {
    if (isGuest) {
      // Handle guest mode
      updateGuestProjectRun(projectRun);
      toast({
        title: "Success",
        description: "Project run updated (sign up to keep permanently)"
      });
      return;
    }

    if (!user) return;

    // Create a unique key for this update to detect duplicates
    const updateKey = `${projectRun.id}-${projectRun.progress}-${JSON.stringify(projectRun.completedSteps)}`;
    
    // Skip if this is the exact same update as the last one
    if (lastUpdateRef.current === updateKey) {
      console.log("🔄 ProjectActions - Skipping duplicate update");
      return;
    }

    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to prevent rapid-fire calls
    updateTimeoutRef.current = setTimeout(async () => {
      // Prevent concurrent updates
      if (updateInProgressRef.current) {
        console.log("🔄 ProjectActions - Update already in progress, queuing...");
        setTimeout(() => updateProjectRun(projectRun), 100);
        return;
      }

      updateInProgressRef.current = true;
      lastUpdateRef.current = updateKey;

      try {
        const safeProgress = Math.round(projectRun.progress || 0);

        const { error } = await supabase
          .from('project_runs')
          .update({
            name: projectRun.name,
            description: projectRun.description,
            start_date: projectRun.startDate.toISOString(),
            plan_end_date: projectRun.planEndDate.toISOString(),
            end_date: projectRun.endDate?.toISOString(),
            status: projectRun.status,
            project_leader: projectRun.projectLeader,
            accountability_partner: projectRun.accountabilityPartner,
            custom_project_name: projectRun.customProjectName,
            current_phase_id: projectRun.currentPhaseId,
            current_operation_id: projectRun.currentOperationId,
            current_step_id: projectRun.currentStepId,
            completed_steps: JSON.stringify(projectRun.completedSteps),
            progress: safeProgress,
            phases: JSON.stringify(projectRun.phases),
            category: Array.isArray(projectRun.category) ? projectRun.category.join(', ') : projectRun.category,
            effort_level: projectRun.effortLevel,
            skill_level: projectRun.skillLevel,
            estimated_time: projectRun.estimatedTime,
            customization_decisions: projectRun.customization_decisions ? JSON.stringify(projectRun.customization_decisions) : null,
            instruction_level_preference: projectRun.instruction_level_preference || 'detailed',
            budget_data: projectRun.budget_data ? JSON.stringify(projectRun.budget_data) : null
          })
          .eq('id', projectRun.id)
          .eq('user_id', user.id);

        if (error) throw error;

        // Optimistically update cache
        const updatedProjectRun = { ...projectRun, progress: safeProgress };
        const updatedProjectRuns = projectRuns.map(run => run.id === projectRun.id ? updatedProjectRun : run);
        updateProjectRunsCache(updatedProjectRuns);
        
        if (currentProjectRun?.id === projectRun.id) {
          setCurrentProjectRun(updatedProjectRun);
        }

        console.log("✅ ProjectActions - Project run updated successfully");
        
      } catch (error) {
        console.error('❌ Error updating project run:', error);
        toast({
          title: "Error",
          description: "Failed to update project run",
          variant: "destructive",
        });
      } finally {
        updateInProgressRef.current = false;
      }
    }, 300); // 300ms debounce
  }, [isGuest, updateGuestProjectRun, user, projectRuns, updateProjectRunsCache, currentProjectRun, setCurrentProjectRun]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can delete projects",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      // Optimistically update cache
      const updatedProjects = projects.filter(p => p.id !== projectId);
      updateProjectsCache(updatedProjects);
      
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, projects, updateProjectsCache, currentProject, setCurrentProject]);

  const deleteProjectRun = useCallback(async (projectRunId: string) => {
    if (isGuest) {
      // Handle guest mode
      deleteGuestProjectRun(projectRunId);
      toast({
        title: "Success",
        description: "Project run deleted"
      });
      return;
    }

    if (!user) return;

    try {
      const { error } = await supabase
        .from('project_runs')
        .delete()
        .eq('id', projectRunId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Optimistically update cache
      const updatedProjectRuns = projectRuns.filter(run => run.id !== projectRunId);
      updateProjectRunsCache(updatedProjectRuns);
      
      if (currentProjectRun?.id === projectRunId) {
        setCurrentProjectRun(null);
      }

      // Success - no toast notification needed
    } catch (error) {
      console.error('Error deleting project run:', error);
      toast({
        title: "Error",
        description: "Failed to delete project run",
        variant: "destructive",
      });
    }
  }, [isGuest, deleteGuestProjectRun, user, projectRuns, updateProjectRunsCache, currentProjectRun, setCurrentProjectRun]);


  const value = {
    currentProject,
    currentProjectRun,
    setCurrentProject,
    setCurrentProjectRun,
    addProject,
    createProjectRun,
    addProjectRun,
    updateProject,
    updateProjectRun,
    deleteProject,
    deleteProjectRun
  };

  return (
    <ProjectActionsContext.Provider value={value}>
      {children}
    </ProjectActionsContext.Provider>
  );
};