import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useDataFetch } from '@/hooks/useDataFetch';
import { useAuth } from './AuthContext';
import { useGuest } from './GuestContext';
import { supabase } from '@/integrations/supabase/client';

interface ProjectDataContextType {
  projects: Project[];
  projectRuns: ProjectRun[];
  loading: boolean;
  error: Error | null;
  refetchProjects: () => Promise<void>;
  refetchProjectRuns: () => Promise<void>;
  updateProjectsCache: (projects: Project[]) => void;
  updateProjectRunsCache: (projectRuns: ProjectRun[]) => void;
}

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined);

export const useProjectData = () => {
  const context = useContext(ProjectDataContext);
  if (context === undefined) {
    throw new Error('useProjectData must be used within a ProjectDataProvider');
  }
  return context;
};

interface ProjectDataProviderProps {
  children: ReactNode;
}

export const ProjectDataProvider: React.FC<ProjectDataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { isGuest, guestData } = useGuest();

  // Memoized transform function for projects (synchronous, loads from JSON first)
  const transformProjects = React.useMemo(() => (data: any[]): Project[] => {
    return data.map(project => {
      let phases = [];
      if (project.phases) {
        try {
          let parsedPhases = project.phases;
          
          if (typeof parsedPhases === 'string') {
            parsedPhases = JSON.parse(parsedPhases);
          }
          
          if (typeof parsedPhases === 'string') {
            console.warn('Phases were double-encoded for project:', project.name);
            parsedPhases = JSON.parse(parsedPhases);
          }
          
          phases = parsedPhases;
        } catch (e) {
          console.error('Failed to parse phases JSON for project:', project.name, e);
          phases = [];
        }
      }
      
      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        diyLengthChallenges: project.diy_length_challenges,
        image: project.image,
        images: project.images,
        cover_image: project.cover_image,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        startDate: new Date(project.start_date),
        planEndDate: new Date(project.plan_end_date),
        endDate: project.end_date ? new Date(project.end_date) : undefined,
        status: project.status as 'not-started' | 'in-progress' | 'complete',
        publishStatus: project.publish_status as 'draft' | 'published' | 'beta-testing' | 'archived',
        category: project.category,
        difficulty: project.difficulty,
        effortLevel: project.effort_level as Project['effortLevel'],
        skillLevel: project.skill_level as Project['skillLevel'],
        estimatedTime: project.estimated_time,
        estimatedTimePerUnit: project.estimated_time_per_unit,
        scalingUnit: project.scaling_unit as Project['scalingUnit'],
        phases: Array.isArray(phases) ? phases : []
      };
    });
  }, []);

  // Memoized transform function for project runs
  const transformProjectRuns = React.useMemo(() => (data: any[]): ProjectRun[] => {
    return data.map(run => {
      let phases = [];
      if (run.phases) {
        try {
          phases = typeof run.phases === 'string' 
            ? JSON.parse(run.phases) 
            : run.phases;
        } catch (e) {
          console.error('Failed to parse project run phases JSON:', e);
          phases = [];
        }
      }

      let completedSteps = [];
      if (run.completed_steps) {
        try {
          completedSteps = typeof run.completed_steps === 'string'
            ? JSON.parse(run.completed_steps)
            : run.completed_steps;
        } catch (e) {
          console.error('Failed to parse completed_steps JSON:', e);
          completedSteps = [];
        }
      }

      let customizationDecisions = undefined;
      if (run.customization_decisions) {
        try {
          customizationDecisions = typeof run.customization_decisions === 'string'
            ? JSON.parse(run.customization_decisions)
            : run.customization_decisions;
        } catch (e) {
          console.error('Failed to parse customization_decisions JSON:', e);
        }
      }

      return {
        id: run.id,
        templateId: run.template_id,
        name: run.name,
        description: run.description || '',
        diyLengthChallenges: run.diy_length_challenges,
        isManualEntry: run.is_manual_entry || false,
        createdAt: new Date(run.created_at),
        updatedAt: new Date(run.updated_at),
        startDate: new Date(run.start_date),
        planEndDate: new Date(run.plan_end_date),
        endDate: run.end_date ? new Date(run.end_date) : undefined,
        status: run.status as 'not-started' | 'in-progress' | 'complete',
        projectLeader: run.project_leader,
        accountabilityPartner: run.accountability_partner,
        customProjectName: run.custom_project_name,
        currentPhaseId: run.current_phase_id,
        currentOperationId: run.current_operation_id,
        currentStepId: run.current_step_id,
        completedSteps: Array.isArray(completedSteps) ? completedSteps : [],
        progress: run.progress,
        phases: Array.isArray(phases) ? phases : [],
        category: run.category,
        effortLevel: run.effort_level as Project['effortLevel'],
        skillLevel: run.skill_level as Project['skillLevel'],
        estimatedTime: run.estimated_time,
        scalingUnit: run.scaling_unit as Project['scalingUnit'],
        customization_decisions: customizationDecisions,
        instruction_level_preference: (run.instruction_level_preference as 'quick' | 'detailed' | 'new_user') || 'detailed'
      };
    });
  }, []);

  // Fetch projects data
  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
    mutate: updateProjectsCache
  } = useDataFetch<Project>({
    table: 'project_templates_live',
    select: '*',
    filters: [{ column: 'is_current_version', value: true }],
    orderBy: { column: 'created_at', ascending: false },
    transform: transformProjects,
    cacheKey: 'projects'
  });

  // Listen for refetch requests from cascade operations
  useEffect(() => {
    const handleRefetchRequest = () => {
      console.log('🔄 ProjectDataContext: Refetching projects due to cascade');
      refetchProjects();
    };

    window.addEventListener('refetch-projects', handleRefetchRequest);
    return () => window.removeEventListener('refetch-projects', handleRefetchRequest);
  }, [refetchProjects]);

  // Fetch project runs data - only when authenticated
  const shouldFetchProjectRuns = !isGuest && !!user;
  
  const {
    data: projectRuns,
    loading: projectRunsLoading,
    error: projectRunsError,
    refetch: refetchProjectRuns,
    mutate: updateProjectRunsCache
  } = useDataFetch<ProjectRun>({
    table: 'project_runs',
    select: '*',
    filters: shouldFetchProjectRuns ? [{ column: 'user_id', value: user.id }] : [],
    orderBy: { column: 'created_at', ascending: false },
    transform: transformProjectRuns,
    dependencies: [user?.id, shouldFetchProjectRuns],
    cacheKey: shouldFetchProjectRuns ? `project_runs_${user.id}` : undefined,
    enabled: shouldFetchProjectRuns
  });

  // Project runs already have complete phases JSON when created (immutable snapshot)
  // No need to enrich from template_steps - just use them as-is
  
  // Log project data being returned for debugging
  console.log('📦 ProjectDataContext returning:', {
    projectCount: projects.length,
    projectsWithPhases: projects.filter(p => p.phases && p.phases.length > 0).length,
    projectPhasesCounts: projects.map(p => ({ name: p.name, phaseCount: p.phases?.length || 0 }))
  });

  const value = {
    projects,
    projectRuns: isGuest ? guestData.projectRuns : projectRuns,
    loading: projectsLoading || (shouldFetchProjectRuns ? projectRunsLoading : false),
    error: projectsError || (shouldFetchProjectRuns ? projectRunsError : null),
    refetchProjects,
    refetchProjectRuns,
    updateProjectsCache,
    updateProjectRunsCache
  };

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  );
};
