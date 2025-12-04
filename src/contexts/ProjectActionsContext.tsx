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

    // Check for duplicate project name (case-insensitive)
    const normalizedName = projectData.name.trim().toLowerCase();
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', projectData.name.trim());

    if (checkError) {
      console.error('Error checking for duplicate project name:', checkError);
      toast({
        title: "Error",
        description: "Failed to validate project name",
        variant: "destructive",
      });
      return;
    }

    if (existingProjects && existingProjects.length > 0) {
      const exactMatch = existingProjects.find(p => p.name.trim().toLowerCase() === normalizedName);
      if (exactMatch) {
        toast({
          title: "Duplicate Project Name",
          description: `A project with the name "${projectData.name}" already exists. Please choose a unique name.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Use database function for proper project_phases architecture
      const { data: projectId, error } = await supabase
        .rpc('create_project_with_standard_foundation_v2', {
          p_project_name: projectData.name,
          p_project_description: projectData.description || '',
          p_category: Array.isArray(projectData.category) ? projectData.category[0] : (projectData.category || 'general')
        });

      if (error) {
        // Check if error is due to duplicate name constraint
        if (error.code === '23505' && error.message.includes('idx_projects_name_unique')) {
          toast({
            title: "Duplicate Project Name",
            description: `A project with the name "${projectData.name}" already exists. Please choose a unique name.`,
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      // Update the created project with additional fields not in RPC
      if (projectId) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            skill_level: projectData.skillLevel || 'Intermediate',
            effort_level: projectData.effortLevel || 'Medium',
            scaling_unit: projectData.scalingUnit || null,
            project_challenges: projectData.projectChallenges || null,
            estimated_time_per_unit: projectData.estimatedTimePerUnit || null,
            project_type: projectData.projectType?.toLowerCase() === 'secondary' ? 'secondary' : 'primary'
          })
          .eq('id', projectId);

        if (updateError) {
          console.error('Error updating additional project fields:', updateError);
        }
      }

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
      // CRITICAL: Validate template has phases before creating project run
      // Project runs MUST be immutable snapshots - they cannot exist without phases
      const templateHasPhases = project.phases && Array.isArray(project.phases) && project.phases.length > 0;
      
      if (!templateHasPhases) {
        console.error('❌ CRITICAL: Cannot create project run - template has no phases!', {
          templateId: project.id,
          templateName: project.name,
          templatePhases: project.phases,
          templatePhasesType: typeof project.phases,
          templatePhasesIsArray: Array.isArray(project.phases),
          templatePhasesLength: Array.isArray(project.phases) ? project.phases.length : 'N/A'
        });
        
        toast({
          title: "Error",
          description: `Cannot create project run: Template "${project.name}" has no phases. Please ensure the template has phases before creating a project run.`,
          variant: "destructive",
        });
        return null;
      }

      console.log('✅ Template validation passed - creating project run:', {
        templateId: project.id,
        templateName: project.name,
        templatePhasesCount: project.phases.length
      });

      // Use database function to create project run snapshot with properly built phases
      // This ensures phases include operations and steps from the template
      console.log('🔄 Calling create_project_run_snapshot with:', {
        templateId: project.id,
        templateName: project.name,
        templatePhasesCount: project.phases?.length || 0,
        templatePhases: project.phases ? (Array.isArray(project.phases) ? `${project.phases.length} phases` : typeof project.phases) : 'null/undefined',
        userId: user.id,
        runName: customName || project.name
      });

      const { data, error } = await supabase.rpc('create_project_run_snapshot', {
        p_template_id: project.id,
        p_user_id: user.id,
        p_run_name: customName || project.name,
        p_home_id: homeId || null,
        p_start_date: new Date().toISOString(),
        p_plan_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      if (error) {
        console.error('❌ Error calling create_project_run_snapshot:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        // Show full error message to user
        toast({
          title: "Failed to Create Project Run",
          description: error.message || "Unknown error occurred while creating project run. Please check console for details.",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        console.error('❌ create_project_run_snapshot returned no ID');
        throw new Error('Project run creation returned no ID');
      }

      console.log('✅ create_project_run_snapshot returned run ID:', data);

      // CRITICAL: Verify that phases were copied to the project run
      // Project runs MUST be immutable snapshots with their own copy of phases
      console.log('🔍 Fetching created project run to verify phases...');
      const { data: createdRun, error: fetchError } = await supabase
        .from('project_runs')
        .select('id, phases, template_id, name')
        .eq('id', data)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching created project run:', fetchError);
        throw fetchError;
      }

      console.log('📋 Created project run data:', {
        runId: createdRun.id,
        runName: createdRun.name,
        hasPhases: !!createdRun.phases,
        phasesType: typeof createdRun.phases,
        phasesIsArray: Array.isArray(createdRun.phases),
        phasesValue: createdRun.phases ? (Array.isArray(createdRun.phases) ? `${createdRun.phases.length} phases` : String(createdRun.phases).substring(0, 100)) : 'null/undefined'
      });

      // CRITICAL: Validate phases exist AND match template phase count
      let parsedPhases: any[] = [];
      let phasesExist = false;
      
      if (createdRun.phases) {
        if (Array.isArray(createdRun.phases)) {
          parsedPhases = createdRun.phases;
          phasesExist = parsedPhases.length > 0;
        } else if (typeof createdRun.phases === 'string') {
          try {
            parsedPhases = JSON.parse(createdRun.phases);
            if (Array.isArray(parsedPhases)) {
              phasesExist = parsedPhases.length > 0;
            }
          } catch (e) {
            console.error('❌ Error parsing phases JSON:', e);
          }
        }
      }

      const templatePhasesCount = project.phases?.length || 0;
      const runPhasesCount = parsedPhases.length;

      if (!phasesExist || runPhasesCount === 0) {
        console.error('❌ CRITICAL: Project run created without phases!', {
          runId: data,
          templateId: project.id,
          templateName: project.name,
          runPhases: createdRun.phases,
          runPhasesType: typeof createdRun.phases,
          templateHasPhases: !!(project.phases && project.phases.length > 0),
          templatePhasesCount,
          runPhasesCount
        });
        
        // Delete the invalid project run - it should not exist without phases
        await supabase
          .from('project_runs')
          .delete()
          .eq('id', data);
        
        throw new Error('Project run was created without phases. The create_project_run_snapshot database function failed. Please ensure the template has phases in the database and the function is working correctly.');
      }

      // CRITICAL: Validate that all phases from template were copied
      if (runPhasesCount < templatePhasesCount) {
        console.error('❌ CRITICAL: Project run created with incomplete phases!', {
          runId: data,
          templateId: project.id,
          templateName: project.name,
          templatePhasesCount,
          runPhasesCount,
          missingPhases: templatePhasesCount - runPhasesCount
        });
        
        // Delete the invalid project run - it must have all phases
        await supabase
          .from('project_runs')
          .delete()
          .eq('id', data);
        
        throw new Error(`Project run was created with only ${runPhasesCount} of ${templatePhasesCount} phases. This indicates a problem with the create_project_run_snapshot function. The project run must be a complete snapshot of the template.`);
      }

      console.log('✅ Project run created successfully with phases:', {
        runId: data,
        templateId: project.id,
        templatePhasesCount: templatePhasesCount,
        runPhasesCount: runPhasesCount,
        phasesMatch: runPhasesCount === templatePhasesCount
      });
      
      // Verify spaces were created
      const { data: spacesData, error: spacesError } = await supabase
        .from('project_run_spaces')
        .select('id, space_name')
        .eq('project_run_id', data);
      
      if (spacesError) {
        console.warn('⚠️ Error checking spaces for new project run:', spacesError);
      } else {
        console.log('✅ Verified spaces created for project run:', {
          runId: data,
          spacesCount: spacesData?.length || 0,
          spaces: spacesData?.map(s => s.space_name) || []
        });
        
        if (!spacesData || spacesData.length === 0) {
          console.error('❌ CRITICAL: No spaces created for project run! Default "Room 1" should have been created.');
        }
      }

      // Update additional fields that the function doesn't handle
      if (customName || project.projectChallenges || project.scalingUnit || project.estimatedTimePerUnit) {
        await supabase
          .from('project_runs')
          .update({
            custom_project_name: customName || null,
            project_challenges: project.projectChallenges || null,
            scaling_unit: project.scalingUnit || null,
            estimated_time_per_unit: project.estimatedTimePerUnit || null
          })
          .eq('id', data);
      }

      await refetchProjectRuns();
      return data || null;
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
      // REQUIREMENT 1: Check if user has homes - if not, create default home
      const { data: existingHomes, error: homesCheckError } = await supabase
        .from('homes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (homesCheckError) {
        console.error('Error checking homes:', homesCheckError);
        throw homesCheckError;
      }

      let defaultHomeId: string | null = null;
      if (!existingHomes || existingHomes.length === 0) {
        // Create default home for new user
        console.log('🏠 No homes found - creating default home for user');
        const { data: newHome, error: homeCreateError } = await supabase
          .from('homes')
          .insert({
            user_id: user.id,
            name: 'My Home',
            is_primary: true,
            home_ownership: 'own' // Default value
          })
          .select('id')
          .single();

        if (homeCreateError) {
          console.error('Error creating default home:', homeCreateError);
          throw homeCreateError;
        }

        defaultHomeId = newHome.id;
        console.log('✅ Default home created:', defaultHomeId);
      }

      // Use new RPC function to create immutable project run snapshot
      const { data: newProjectRunId, error } = await supabase
        .rpc('create_project_run_snapshot', {
          p_template_id: projectRunData.templateId,
          p_user_id: user.id,
          p_run_name: projectRunData.name,
          p_home_id: defaultHomeId, // Use default home if created, otherwise null (will be set in kickoff step 3)
          p_start_date: projectRunData.startDate.toISOString(),
          p_plan_end_date: projectRunData.planEndDate.toISOString()
        });

      if (error) throw error;

      // Update project run with additional fields that aren't copied by the RPC function
      // The RPC function only copies phases, so we need to update description and other metadata
      if (newProjectRunId) {
        const updateFields: any = {
          updated_at: new Date().toISOString()
        };
        
        // Update description (even if empty string - ensures it's set from template)
        if (projectRunData.description !== undefined) {
          updateFields.description = projectRunData.description || null;
        }
        
        // Only update other fields if they are provided in projectRunData
        if (projectRunData.category !== undefined) {
          updateFields.category = Array.isArray(projectRunData.category) 
            ? projectRunData.category 
            : (projectRunData.category ? [projectRunData.category] : null);
        }
        if (projectRunData.effortLevel !== undefined) updateFields.effort_level = projectRunData.effortLevel || null;
        if (projectRunData.skillLevel !== undefined) updateFields.skill_level = projectRunData.skillLevel || null;
        if (projectRunData.estimatedTime !== undefined) updateFields.estimated_time = projectRunData.estimatedTime || null;
        if (projectRunData.estimatedTotalTime !== undefined) updateFields.estimated_total_time = projectRunData.estimatedTotalTime || null;
        if (projectRunData.typicalProjectSize !== undefined) updateFields.typical_project_size = projectRunData.typicalProjectSize || null;
        if (projectRunData.scalingUnit !== undefined) updateFields.scaling_unit = projectRunData.scalingUnit || null;
        if (projectRunData.itemType !== undefined) updateFields.item_type = projectRunData.itemType || null;
        if (projectRunData.projectChallenges !== undefined) updateFields.project_challenges = projectRunData.projectChallenges || null;
        
        // Always update (at minimum updated_at, but usually description and other fields too)
        const { error: updateError } = await supabase
          .from('project_runs')
          .update(updateFields)
          .eq('id', newProjectRunId);
        
        if (updateError) {
          console.error('⚠️ Error updating project run metadata:', updateError);
          // Don't throw - project run was created successfully, just metadata update failed
        } else {
          console.log('✅ Project run metadata updated:', Object.keys(updateFields).filter(k => k !== 'updated_at'));
        }
      }

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
      // Re-throw error so caller can handle it
      throw error;
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
      console.log('🔧 updateProject called:', { 
        projectId: project.id, 
        phasesCount: project.phases?.length 
      });
      
      // Check for duplicate project name if name is being changed
      if (project.name && project.name.trim()) {
        const normalizedName = project.name.trim().toLowerCase();
        const { data: existingProjects, error: checkError } = await supabase
          .from('projects')
          .select('id, name')
          .neq('id', project.id) // Exclude current project
          .ilike('name', project.name.trim());

        if (checkError) {
          console.error('Error checking for duplicate project name:', checkError);
          toast({
            title: "Error",
            description: "Failed to validate project name",
            variant: "destructive",
          });
          return;
        }

        if (existingProjects && existingProjects.length > 0) {
          const exactMatch = existingProjects.find(p => p.name.trim().toLowerCase() === normalizedName);
          if (exactMatch) {
            toast({
              title: "Duplicate Project Name",
              description: `A project with the name "${project.name}" already exists. Please choose a unique name.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
      
      // For all projects (including Standard Project), we DON'T update phases JSON
      // The database triggers will automatically rebuild it from template_operations/template_steps
      
      // Update only the project metadata (not phases)
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: project.name,
          description: project.description,
          category: Array.isArray(project.category) ? project.category : (project.category ? [project.category] : []),
          scaling_unit: project.scalingUnit,
          estimated_time_per_unit: project.estimatedTimePerUnit,
          skill_level: project.skillLevel,
          effort_level: project.effortLevel,
          estimated_time: project.estimatedTime,
          project_challenges: project.projectChallenges,
          image: project.image,
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      if (updateError) {
        // Check if error is due to duplicate name constraint
        if (updateError.code === '23505' && updateError.message.includes('idx_projects_name_unique')) {
          toast({
            title: "Duplicate Project Name",
            description: `A project with the name "${project.name}" already exists. Please choose a unique name.`,
            variant: "destructive",
          });
          return;
        }
        console.error('❌ Error updating project:', updateError);
        throw updateError;
      }

      console.log('✅ Project metadata updated successfully');
      
      // NOTE: step_number was renamed to display_order in template_steps
      // Ordering is handled by position_rule/position_value for phases and display_order for steps

      // Optimistically update cache
      const updatedProjects = projects.map(p => p.id === project.id ? project : p);
      updateProjectsCache(updatedProjects);
      
      if (currentProject?.id === project.id) {
        setCurrentProject(project);
      }
      
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
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
    // Include budget_data, issue_reports, and time_tracking to ensure these updates are never skipped
    const budgetDataKey = projectRun.budget_data ? JSON.stringify(projectRun.budget_data) : 'null';
    const issueReportsKey = projectRun.issue_reports ? JSON.stringify(projectRun.issue_reports) : 'null';
    const timeTrackingKey = projectRun.time_tracking ? JSON.stringify(projectRun.time_tracking) : 'null';
    const updateKey = `${projectRun.id}-${projectRun.progress}-${JSON.stringify(projectRun.completedSteps)}-${budgetDataKey}-${issueReportsKey}-${timeTrackingKey}`;
    
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
    // Ensure progress is always a number (handle null, undefined, or missing)
    const safeProgress = Math.round(projectRun.progress ?? 0);
    const updatedProjectRun = { ...projectRun, progress: safeProgress };
    
    // CRITICAL: Ensure initial_budget, initial_timeline, initial_sizing are preserved
    // These come from the database as snake_case but need to be in the context object
    if ((projectRun as any).initial_budget !== undefined) {
      (updatedProjectRun as any).initial_budget = (projectRun as any).initial_budget;
    }
    if ((projectRun as any).initial_timeline !== undefined) {
      (updatedProjectRun as any).initial_timeline = (projectRun as any).initial_timeline;
    }
    if ((projectRun as any).initial_sizing !== undefined) {
      (updatedProjectRun as any).initial_sizing = (projectRun as any).initial_sizing;
    }
    
    const updatedProjectRuns = projectRuns.map(run => run.id === projectRun.id ? updatedProjectRun : run);
    updateProjectRunsCache(updatedProjectRuns);
    
    if (currentProjectRun?.id === projectRun.id) {
      setCurrentProjectRun(updatedProjectRun);
      console.log('✅ ProjectActions: Updated currentProjectRun with initial_budget:', (updatedProjectRun as any).initial_budget);
    }

    // CRITICAL: For budget_data, issue_reports, and time_tracking updates, save immediately
    // These are user-initiated changes that must be persisted right away
    const isBudgetDataUpdate = projectRun.budget_data !== undefined;
    const isIssueReportsUpdate = projectRun.issue_reports !== undefined;
    const isTimeTrackingUpdate = projectRun.time_tracking !== undefined;
    const requiresImmediateSave = isBudgetDataUpdate || isIssueReportsUpdate || isTimeTrackingUpdate;
    
    // For immediate saves (budget, issues, time tracking), execute right away
    // For other updates, debounce to avoid excessive database writes
    const saveToDatabase = async () => {
      // Prevent concurrent updates
      if (updateInProgressRef.current) {
        console.log("🔄 ProjectActions - Update already in progress, queuing...");
        setTimeout(() => updateProjectRun(projectRun), 100);
        return;
      }

      updateInProgressRef.current = true;
      lastUpdateRef.current = updateKey;

      try {
        console.log('💾 ProjectActions - Saving project run to database:', {
          projectRunId: projectRun.id,
          userId: user.id,
          name: projectRun.name,
          completedStepsCount: projectRun.completedSteps.length,
          progress: safeProgress,
          initial_budget: (projectRun as any).initial_budget,
          initial_timeline: (projectRun as any).initial_timeline,
          initial_sizing: (projectRun as any).initial_sizing,
          hasBudgetData: !!projectRun.budget_data,
          hasPhotos: !!(projectRun.project_photos),
          home_id: (projectRun as any).home_id
        });

        const updateData = {
          name: projectRun.name,
          description: projectRun.description,
          start_date: projectRun.startDate.toISOString(),
          plan_end_date: projectRun.planEndDate.toISOString(),
          end_date: projectRun.endDate?.toISOString(),
          status: projectRun.status,
          project_leader: projectRun.projectLeader,
          accountability_partner: projectRun.accountabilityPartner,
          custom_project_name: projectRun.customProjectName,
          home_id: (projectRun as any).home_id || null,
          current_phase_id: projectRun.currentPhaseId,
          current_operation_id: projectRun.currentOperationId,
          current_step_id: projectRun.currentStepId,
          completed_steps: JSON.stringify(projectRun.completedSteps),
          step_completion_percentages: projectRun.stepCompletionPercentages ? JSON.stringify(projectRun.stepCompletionPercentages) : null,
          progress: safeProgress || 0,
          phases: JSON.stringify(projectRun.phases),
          category: Array.isArray(projectRun.category) ? projectRun.category.join(', ') : projectRun.category,
          effort_level: projectRun.effortLevel,
          skill_level: projectRun.skillLevel,
          estimated_time: projectRun.estimatedTime,
          customization_decisions: projectRun.customization_decisions ? JSON.stringify(projectRun.customization_decisions) : null,
          instruction_level_preference: projectRun.instruction_level_preference || 'intermediate',
          budget_data: projectRun.budget_data ? JSON.stringify(projectRun.budget_data) : null,
          issue_reports: projectRun.issue_reports ? JSON.stringify(projectRun.issue_reports) : null,
          time_tracking: projectRun.time_tracking ? JSON.stringify(projectRun.time_tracking) : null,
          project_photos: projectRun.project_photos ? JSON.stringify(projectRun.project_photos) : null,
          phase_ratings: projectRun.phase_ratings ? JSON.stringify(projectRun.phase_ratings) : null,
          survey_data: projectRun.survey_data ? JSON.stringify(projectRun.survey_data) : null,
          feedback_data: projectRun.feedback_data ? JSON.stringify(projectRun.feedback_data) : null,
          schedule_events: projectRun.schedule_events ? JSON.stringify(projectRun.schedule_events) : null,
          shopping_checklist_data: projectRun.shopping_checklist_data ? JSON.stringify(projectRun.shopping_checklist_data) : null,
          progress_reporting_style: projectRun.progress_reporting_style || 'linear',
          initial_budget: (projectRun as any).initial_budget || null,
          initial_timeline: (projectRun as any).initial_timeline || null,
          initial_sizing: (projectRun as any).initial_sizing || null,
          schedule_optimization_method: projectRun.schedule_optimization_method || 'single-piece-flow',
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('project_runs')
          .update(updateData)
          .eq('id', projectRun.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('❌ ProjectActions - Database update error:', error);
          throw error;
        }

        console.log("✅ ProjectActions - Project run updated successfully in database for user:", user.id);
        
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
    };
    
    if (requiresImmediateSave) {
      // Save immediately for budget_data, issue_reports, time_tracking
      saveToDatabase();
    } else {
      // Debounce other updates
      updateTimeoutRef.current = setTimeout(saveToDatabase, 300);
    }
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
          projectChallenges: freshRun.project_challenges,
          projectLeader: freshRun.project_leader,
          customProjectName: freshRun.custom_project_name,
          accountabilityPartner: freshRun.accountability_partner,
          budget_data: typeof freshRun.budget_data === 'string' ? JSON.parse(freshRun.budget_data) : freshRun.budget_data,
          phase_ratings: typeof freshRun.phase_ratings === 'string' ? JSON.parse(freshRun.phase_ratings) : freshRun.phase_ratings,
          issue_reports: typeof freshRun.issue_reports === 'string' ? JSON.parse(freshRun.issue_reports) : freshRun.issue_reports,
          shopping_checklist_data: typeof freshRun.shopping_checklist_data === 'string' ? JSON.parse(freshRun.shopping_checklist_data) : freshRun.shopping_checklist_data,
          schedule_events: typeof freshRun.schedule_events === 'string' ? JSON.parse(freshRun.schedule_events) : freshRun.schedule_events,
          customization_decisions: typeof freshRun.customization_decisions === 'string' ? JSON.parse(freshRun.customization_decisions) : freshRun.customization_decisions,
          instruction_level_preference: freshRun.instruction_level_preference as 'quick' | 'detailed' | 'new_user',
          progress_reporting_style: (freshRun.progress_reporting_style as 'linear' | 'exponential' | 'time-based') || 'linear',
          // CRITICAL: Include initial_budget, initial_timeline, initial_sizing from database
          initial_budget: freshRun.initial_budget || null,
          initial_timeline: freshRun.initial_timeline || null,
          initial_sizing: freshRun.initial_sizing || null
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