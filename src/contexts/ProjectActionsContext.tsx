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
  refreshProjectRunFromTemplate: (runId: string) => Promise<void>;
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
      // Check if this is the Standard Project Foundation
      const isStandardProject = project.id === '00000000-0000-0000-0000-000000000001' || project.isStandardTemplate;
      
      console.log('🔧 updateProject called:', { 
        projectId: project.id, 
        isStandardProject,
        phasesCount: project.phases?.length 
      });
      
      if (isStandardProject) {
        console.log('🔧 Updating Standard Project - phases and template tables');
        console.log('🔧 Project ID:', project.id);
        console.log('🔧 Phases to update:', project.phases.map(p => ({ 
          id: p.id, 
          name: p.name, 
          opsCount: p.operations.length 
        })));
        
        // First update the phases JSON
        const { error: phasesError } = await supabase
          .from('projects')
          .update({
            phases: JSON.stringify(project.phases),
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id);

        if (phasesError) {
          console.error('❌ Error updating phases JSON:', phasesError);
          throw phasesError;
        }

        console.log('✅ Phases JSON updated successfully');

        // Then update display_order of template_operations and template_steps
        let updatedOpsCount = 0;
        let updatedStepsCount = 0;
        
        for (let phaseIndex = 0; phaseIndex < project.phases.length; phaseIndex++) {
          const phase = project.phases[phaseIndex];
          
          // Update operations within this phase
          for (let opIndex = 0; opIndex < phase.operations.length; opIndex++) {
            const operation = phase.operations[opIndex];
            
            console.log('🔧 Updating operation:', {
              operationId: operation.id,
              name: operation.name,
              phaseId: phase.id,
              newDisplayOrder: opIndex,
              projectId: project.id
            });
            
            const { error: opError, data: opData } = await supabase
              .from('template_operations')
              .update({ 
                display_order: opIndex,
                updated_at: new Date().toISOString()
              })
              .eq('id', operation.id)
              .eq('project_id', project.id)
              .select();
            
            if (opError) {
              console.error('❌ Error updating operation display_order:', opError);
            } else {
              updatedOpsCount++;
              console.log('✅ Operation updated:', opData);
            }

            // Update steps within this operation
            for (let stepIndex = 0; stepIndex < operation.steps.length; stepIndex++) {
              const step = operation.steps[stepIndex];
              
              console.log('🔧 Updating step:', {
                stepId: step.id,
                title: step.step,
                operationId: operation.id,
                newDisplayOrder: stepIndex
              });
              
              const { error: stepError, data: stepData } = await supabase
                .from('template_steps')
                .update({ 
                  display_order: stepIndex,
                  updated_at: new Date().toISOString()
                })
                .eq('id', step.id)
                .eq('operation_id', operation.id)
                .select();
              
              if (stepError) {
                console.error('❌ Error updating step display_order:', stepError);
              } else {
                updatedStepsCount++;
                console.log('✅ Step updated:', stepData);
              }
            }
          }
        }
        
        console.log('✅ Template tables updated:', { 
          operations: updatedOpsCount, 
          steps: updatedStepsCount 
        });
        
        toast({
          title: "Success",
          description: `Standard Project updated (${updatedOpsCount} operations, ${updatedStepsCount} steps)`,
        });
      } else {
        // For regular projects, update phases JSON AND sync custom phases to database
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

        // Optimistically update cache IMMEDIATELY for responsive UI
        const updatedProjects = projects.map(p => p.id === project.id ? project : p);
        updateProjectsCache(updatedProjects);
        
        if (currentProject?.id === project.id) {
          setCurrentProject(project);
        }

        // Sync custom phases to template tables in background (don't block UI)
        const { syncAllPhasesToDatabase } = await import('@/utils/phaseSynchronization');
        syncAllPhasesToDatabase(project).catch(err => {
          console.error('❌ Error syncing custom phases:', err);
        });
        console.log('✅ Custom phase sync initiated');
      }
    } catch (error) {
      console.error('❌ Error updating project:', error);
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

    // IMMEDIATE optimistic cache update - no debounce for step completion
    const safeProgress = Math.round(projectRun.progress || 0);
    const updatedProjectRun = { ...projectRun, progress: safeProgress };
    const updatedProjectRuns = projectRuns.map(run => run.id === projectRun.id ? updatedProjectRun : run);
    updateProjectRunsCache(updatedProjectRuns);
    
    if (currentProjectRun?.id === projectRun.id) {
      setCurrentProjectRun(updatedProjectRun);
    }

    // Debounce the database write (but cache is already updated)
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
            budget_data: projectRun.budget_data ? JSON.stringify(projectRun.budget_data) : null,
            issue_reports: projectRun.issue_reports ? JSON.stringify(projectRun.issue_reports) : null,
            time_tracking: projectRun.time_tracking ? JSON.stringify(projectRun.time_tracking) : null
          })
          .eq('id', projectRun.id)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log("✅ ProjectActions - Project run updated successfully in database");
        
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
    }, 300); // 300ms debounce for DB write only
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

  const refreshProjectRunFromTemplate = useCallback(async (runId: string) => {
    console.log('🔄 refreshProjectRunFromTemplate CALLED:', { runId });
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to refresh project runs",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the database function to refresh the project run
      const { data, error } = await supabase.rpc('refresh_project_run_from_template', {
        p_run_id: runId
      });

      if (error) throw error;

      // Fetch the refreshed project run
      const { data: freshRun, error: fetchError } = await supabase
        .from('project_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (fetchError) throw fetchError;

      if (freshRun) {
        // Transform the data (handle JSON fields and snake_case to camelCase)
        const transformedRun: ProjectRun = {
          id: freshRun.id,
          templateId: freshRun.template_id,
          name: freshRun.name,
          description: freshRun.description || '',
          home_id: freshRun.home_id || undefined,
          status: freshRun.status as 'not-started' | 'in-progress' | 'complete' | 'cancelled',
          createdAt: new Date(freshRun.created_at),
          updatedAt: new Date(freshRun.updated_at),
          startDate: new Date(freshRun.start_date),
          planEndDate: new Date(freshRun.plan_end_date),
          endDate: freshRun.end_date ? new Date(freshRun.end_date) : undefined,
          phases: typeof freshRun.phases === 'string' ? JSON.parse(freshRun.phases) : freshRun.phases,
          currentPhaseId: freshRun.current_phase_id,
          currentOperationId: freshRun.current_operation_id,
          currentStepId: freshRun.current_step_id,
          completedSteps: typeof freshRun.completed_steps === 'string' ? JSON.parse(freshRun.completed_steps) : freshRun.completed_steps || [],
          progress: freshRun.progress || 0,
          category: Array.isArray(freshRun.category) ? freshRun.category : freshRun.category ? [freshRun.category] : undefined,
          estimatedTime: freshRun.estimated_time,
          effortLevel: freshRun.effort_level as 'Low' | 'Medium' | 'High',
          skillLevel: freshRun.skill_level as 'Beginner' | 'Intermediate' | 'Advanced',
          diyLengthChallenges: freshRun.diy_length_challenges,
          projectLeader: freshRun.project_leader,
          customProjectName: freshRun.custom_project_name,
          accountabilityPartner: freshRun.accountability_partner,
          budget_data: typeof freshRun.budget_data === 'string' ? JSON.parse(freshRun.budget_data) : freshRun.budget_data,
          phase_ratings: typeof freshRun.phase_ratings === 'string' ? JSON.parse(freshRun.phase_ratings) : freshRun.phase_ratings,
          issue_reports: typeof freshRun.issue_reports === 'string' ? JSON.parse(freshRun.issue_reports) : freshRun.issue_reports,
          shopping_checklist_data: typeof freshRun.shopping_checklist_data === 'string' ? JSON.parse(freshRun.shopping_checklist_data) : freshRun.shopping_checklist_data,
          schedule_events: typeof freshRun.schedule_events === 'string' ? JSON.parse(freshRun.schedule_events) : freshRun.schedule_events,
          customization_decisions: typeof freshRun.customization_decisions === 'string' ? JSON.parse(freshRun.customization_decisions) : freshRun.customization_decisions,
          instruction_level_preference: freshRun.instruction_level_preference as 'quick' | 'detailed' | 'new_user'
        };

        // Update cache and current project run
        const updatedProjectRuns = projectRuns.map(run => 
          run.id === runId ? transformedRun : run
        );
        updateProjectRunsCache(updatedProjectRuns);
        
        if (currentProjectRun?.id === runId) {
          setCurrentProjectRun(transformedRun);
        }

        toast({
          title: "Success",
          description: "Project refreshed with latest template updates!",
        });
      }
    } catch (error) {
      console.error('Error refreshing project run:', error);
      toast({
        title: "Error",
        description: "Failed to refresh project run",
        variant: "destructive",
      });
    }
  }, [user, projectRuns, updateProjectRunsCache, currentProjectRun, setCurrentProjectRun]);


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
    deleteProjectRun,
    refreshProjectRunFromTemplate
  };

  return (
    <ProjectActionsContext.Provider value={value}>
      {children}
    </ProjectActionsContext.Provider>
  );
};