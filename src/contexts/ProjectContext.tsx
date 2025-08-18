import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';

interface ProjectContextType {
  projects: Project[];
  projectRuns: ProjectRun[];
  currentProject: Project | null;
  currentProjectRun: ProjectRun | null;
  isAdmin: boolean;
  loading: boolean;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectRun: (projectRun: ProjectRun | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addProjectRun: (projectRun: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  updateProjectRun: (projectRun: ProjectRun) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteProjectRun: (projectRunId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchProjectRuns: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectRuns, setProjectRuns] = useState<ProjectRun[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectRun, setCurrentProjectRun] = useState<ProjectRun | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!error && data) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Error",
          description: "Failed to fetch projects",
          variant: "destructive",
        });
        return;
      }

      const transformedProjects: Project[] = data.map(project => {
        // Properly parse phases JSON data
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
          image: project.image,
          createdAt: new Date(project.created_at),
          updatedAt: new Date(project.updated_at),
          startDate: new Date(project.start_date),
          planEndDate: new Date(project.plan_end_date),
          endDate: project.end_date ? new Date(project.end_date) : undefined,
          status: project.status as 'not-started' | 'in-progress' | 'complete',
          publishStatus: project.publish_status as 'draft' | 'published',
          category: project.category,
          difficulty: project.difficulty as Project['difficulty'],
          effortLevel: project.effort_level as Project['effortLevel'],
          estimatedTime: project.estimated_time,
          estimatedTimePerUnit: project.estimated_time_per_unit,
          scalingUnit: project.scaling_unit as Project['scalingUnit'],
          phases: Array.isArray(phases) ? phases : []
        };
      });

      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // Fetch project runs
  const fetchProjectRuns = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project runs:', error);
        toast({
          title: "Error",
          description: "Failed to fetch project runs",
          variant: "destructive",
        });
        return;
      }

      const transformedProjectRuns: ProjectRun[] = data.map(run => ({
        id: run.id,
        templateId: run.template_id,
        name: run.name,
        description: run.description || '',
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
        completedSteps: (run.completed_steps as string[]) || [],
        progress: run.progress,
        phases: (run.phases as any) || [],
        category: run.category,
        difficulty: run.difficulty as Project['difficulty'],
        estimatedTime: run.estimated_time
      }));

      setProjectRuns(transformedProjectRuns);
    } catch (error) {
      console.error('Error fetching project runs:', error);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchProjectRuns();
    } else {
      setProjects([]);
      setProjectRuns([]);
      setCurrentProject(null);
      setCurrentProjectRun(null);
    }
    setLoading(false);
  }, [user]);

  const addProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !isAdmin) {
      toast({
        title: "Error",
        description: "Only administrators can create projects",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: projectData.name,
          description: projectData.description,
          image: projectData.image,
          start_date: projectData.startDate.toISOString(),
          plan_end_date: projectData.planEndDate.toISOString(),
          end_date: projectData.endDate?.toISOString(),
          status: projectData.status,
          publish_status: projectData.publishStatus,
          category: projectData.category || null,
          difficulty: projectData.difficulty || null,
          effort_level: projectData.effortLevel || null,
          estimated_time: projectData.estimatedTime || null,
          estimated_time_per_unit: projectData.estimatedTimePerUnit || null,
          scaling_unit: projectData.scalingUnit || null,
          phases: JSON.stringify(projectData.phases),
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProjects();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const addProjectRun = async (projectRunData: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_runs')
        .insert({
          template_id: projectRunData.templateId,
          user_id: user.id,
          name: projectRunData.name,
          description: projectRunData.description,
          start_date: projectRunData.startDate.toISOString(),
          plan_end_date: projectRunData.planEndDate.toISOString(),
          end_date: projectRunData.endDate?.toISOString(),
          status: projectRunData.status,
          project_leader: projectRunData.projectLeader,
          accountability_partner: projectRunData.accountabilityPartner,
          custom_project_name: projectRunData.customProjectName,
          current_phase_id: projectRunData.currentPhaseId,
          current_operation_id: projectRunData.currentOperationId,
          current_step_id: projectRunData.currentStepId,
          completed_steps: JSON.stringify(projectRunData.completedSteps),
          progress: projectRunData.progress,
          phases: JSON.stringify(projectRunData.phases),
          category: projectRunData.category,
          difficulty: projectRunData.difficulty,
          estimated_time: projectRunData.estimatedTime
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProjectRuns();
      toast({
        title: "Success",
        description: "Project run created successfully",
      });
    } catch (error) {
      console.error('Error adding project run:', error);
      toast({
        title: "Error",
        description: "Failed to create project run",
        variant: "destructive",
      });
    }
  };

  const updateProject = async (project: Project) => {
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
          image: project.image,
          start_date: project.startDate.toISOString(),
          plan_end_date: project.planEndDate.toISOString(),
          end_date: project.endDate?.toISOString(),
          status: project.status,
          publish_status: project.publishStatus,
          category: project.category || null,
          difficulty: project.difficulty || null,
          effort_level: project.effortLevel || null,
          estimated_time: project.estimatedTime || null,
          estimated_time_per_unit: project.estimatedTimePerUnit || null,
          scaling_unit: project.scalingUnit || null,
          phases: JSON.stringify(project.phases)
        })
        .eq('id', project.id);

      if (error) throw error;

      // Update local state immediately instead of re-fetching
      setProjects(prevProjects => 
        prevProjects.map(p => p.id === project.id ? project : p)
      );
      
      // Update currentProject if it's the one being updated
      if (currentProject?.id === project.id) {
        setCurrentProject(project);
      }

      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  };

  const updateProjectRun = async (projectRun: ProjectRun) => {
    if (!user) return;

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
          progress: projectRun.progress,
          phases: JSON.stringify(projectRun.phases),
          category: projectRun.category,
          difficulty: projectRun.difficulty,
          estimated_time: projectRun.estimatedTime
        })
        .eq('id', projectRun.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchProjectRuns();
      toast({
        title: "Success",
        description: "Project run updated successfully",
      });
    } catch (error) {
      console.error('Error updating project run:', error);
      toast({
        title: "Error",
        description: "Failed to update project run",
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string) => {
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

      if (currentProject?.id === projectId) {
        setCurrentProject(null);
      }

      await fetchProjects();
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
  };

  const deleteProjectRun = async (projectRunId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('project_runs')
        .delete()
        .eq('id', projectRunId)
        .eq('user_id', user.id);

      if (error) throw error;

      if (currentProjectRun?.id === projectRunId) {
        setCurrentProjectRun(null);
      }

      await fetchProjectRuns();
      toast({
        title: "Success",
        description: "Project run deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting project run:', error);
      toast({
        title: "Error",
        description: "Failed to delete project run",
        variant: "destructive",
      });
    }
  };

  const handleSetCurrentProjectRun = (projectRun: ProjectRun | null) => {
    setCurrentProjectRun(projectRun);
    if (projectRun) {
      setCurrentProject(null); // Clear current project when a run is selected
    }
  };

  const value: ProjectContextType = {
    projects,
    projectRuns,
    currentProject,
    currentProjectRun,
    isAdmin,
    loading,
    setCurrentProject,
    setCurrentProjectRun: handleSetCurrentProjectRun,
    addProject,
    addProjectRun,
    updateProject,
    updateProjectRun,
    deleteProject,
    deleteProjectRun,
    fetchProjects,
    fetchProjectRuns
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};