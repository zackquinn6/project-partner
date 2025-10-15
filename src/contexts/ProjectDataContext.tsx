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
  const [enrichedProjects, setEnrichedProjects] = useState<Project[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

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
        customization_decisions: customizationDecisions
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

  // Enrich projects with normalized data
  useEffect(() => {
    const enrichProjects = async () => {
      if (!projects || projects.length === 0 || isEnriching) return;
      
      setIsEnriching(true);
      
      try {
        const enriched = await Promise.all(projects.map(async (project) => {
          // If project already has complete phases JSON with steps, use it as-is
          // Don't overwrite with data from template_steps which might be outdated
          if (project.phases && project.phases.length > 0) {
            const hasCompleteData = project.phases.some(phase => 
              phase.operations && phase.operations.length > 0 &&
              phase.operations.some(op => op.steps && op.steps.length > 0)
            );
            
            if (hasCompleteData) {
              console.log('✅ Using existing phases JSON for project:', project.name);
              return project;
            }
          }
          
          // Try to load from normalized tables (for projects without phases JSON)
          try {
            const { data: operations, error: opsError } = await supabase
              .from('template_operations')
              .select(`
                id,
                name,
                description,
                display_order,
                standard_phase_id,
                standard_phases!inner(id, name, description, display_order)
              `)
              .eq('project_id', project.id)
              .order('display_order');

            if (opsError) throw opsError;

            if (operations && operations.length > 0) {
              // Fetch all steps for these operations
              const operationIds = operations.map(op => op.id);
              const { data: steps, error: stepsError } = await supabase
                .from('template_steps')
                .select('*')
                .in('operation_id', operationIds)
                .order('display_order');

              if (stepsError) throw stepsError;

              // Group operations by phase
              const phaseMap = new Map();
              
              operations.forEach(op => {
                const phase = op.standard_phases;
                if (!phase) return;
                
                if (!phaseMap.has(phase.id)) {
                  phaseMap.set(phase.id, {
                    id: phase.id,
                    name: phase.name,
                    description: phase.description,
                    operations: []
                  });
                }
                
                const operationSteps = (steps || [])
                  .filter(step => step.operation_id === op.id)
                  .map(step => ({
                    id: step.id,
                    step: step.step_title,
                    description: step.description || '',
                    contentType: 'text',
                    content: step.content_sections || [],
                    materials: step.materials || [],
                    tools: step.tools || [],
                    outputs: step.outputs || [],
                    apps: step.apps || []
                  }));
                
                phaseMap.get(phase.id).operations.push({
                  id: op.id,
                  name: op.name,
                  description: op.description || '',
                  steps: operationSteps
                });
              });
              
              // Convert map to array and sort by phase display order
              const phases = Array.from(phaseMap.values())
                .sort((a, b) => {
                  const aPhase = operations.find(op => op.standard_phases?.id === a.id)?.standard_phases;
                  const bPhase = operations.find(op => op.standard_phases?.id === b.id)?.standard_phases;
                  return (aPhase?.display_order || 0) - (bPhase?.display_order || 0);
                });

              console.log('✅ Enriched project from normalized tables:', {
                projectId: project.id,
                projectName: project.name,
                phaseCount: phases.length,
                totalOperations: operations.length,
                totalSteps: steps?.length || 0
              });

              return { ...project, phases };
            }
          } catch (e) {
            console.warn('Failed to load normalized data for project:', project.name, e);
          }

          // Return original project if enrichment failed
          return project;
        }));

        setEnrichedProjects(enriched);
      } catch (e) {
        console.error('Failed to enrich projects:', e);
        setEnrichedProjects(projects);
      } finally {
        setIsEnriching(false);
      }
    };

    enrichProjects();
  }, [projects]);

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
  const value = {
    projects: enrichedProjects.length > 0 ? enrichedProjects : projects,
    projectRuns: isGuest ? guestData.projectRuns : projectRuns,
    loading: projectsLoading || isEnriching || (shouldFetchProjectRuns ? projectRunsLoading : false),
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
