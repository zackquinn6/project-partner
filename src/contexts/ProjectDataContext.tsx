import React, { createContext, useContext, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useDataFetch } from '@/hooks/useDataFetch';
import { useAuth } from './AuthContext';

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

  // Memoized transform function for projects with better error handling
  const transformProjects = React.useMemo(() => (data: any[]): Project[] => {
    return data.map(project => {
      let phases = [];
      if (project.phases) {
        try {
          phases = typeof project.phases === 'string' 
            ? JSON.parse(project.phases) 
            : project.phases;
        } catch (e) {
          console.error('Failed to parse phases JSON:', e);
          phases = [];
        }
      }
      
      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        diyLengthChallenges: project.diy_length_challenges,
        image: project.image,
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

  // Memoized transform function for project runs with better error handling
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
        estimatedTime: run.estimated_time
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
    table: 'projects',
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
    transform: transformProjects,
    cacheKey: 'projects'
  });

  // Fetch project runs data with explicit refetch to get latest data
  const {
    data: projectRuns,
    loading: projectRunsLoading,
    error: projectRunsError,
    refetch: refetchProjectRuns,
    mutate: updateProjectRunsCache
  } = useDataFetch<ProjectRun>({
    table: 'project_runs',
    select: '*',
    filters: user ? [{ column: 'user_id', value: user.id }] : [],
    orderBy: { column: 'created_at', ascending: false },
    transform: transformProjectRuns,
    dependencies: [user?.id],
    cacheKey: user ? `project_runs_${user.id}_${Date.now()}` : undefined // Force refresh with timestamp
  });

  const value = {
    projects,
    projectRuns: user ? projectRuns : [],
    loading: projectsLoading || projectRunsLoading,
    error: projectsError || projectRunsError,
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