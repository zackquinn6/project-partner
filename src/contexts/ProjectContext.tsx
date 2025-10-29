import React, { createContext, useContext, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { useProjectData } from './ProjectDataContext';
import { useProjectActions } from './ProjectActionsContext';
import { useUserRole } from '@/hooks/useUserRole';

// Legacy context for backwards compatibility
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
  createProjectRun: (project: Project, customName?: string, homeId?: string) => Promise<string | null>;
  addProjectRun: (projectRun: Omit<ProjectRun, 'id' | 'createdAt' | 'updatedAt'>, onSuccess?: (projectRunId: string) => void) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  updateProjectRun: (projectRun: ProjectRun) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteProjectRun: (projectRunId: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchProjectRuns: () => Promise<void>;
  refreshProjectRunFromTemplate: (runId: string) => Promise<void>;
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

// Lightweight wrapper that combines the new split contexts for backwards compatibility
export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  console.log('ProjectProvider: Starting initialization...');
  
  // Add error boundaries and safe initialization
  let projectData, projectActions;
  
  try {
    projectData = useProjectData();
    console.log('ProjectProvider: useProjectData successful', !!projectData);
  } catch (error) {
    console.error('ProjectProvider: useProjectData failed', error);
    return <div>Error loading project data</div>;
  }
  
  try {
    projectActions = useProjectActions();
    console.log('ProjectProvider: useProjectActions successful', !!projectActions);
  } catch (error) {
    console.error('ProjectProvider: useProjectActions failed', error);
    return <div>Error loading project actions</div>;
  }
  
  const { isAdmin } = useUserRole();

  // Safety checks to prevent context initialization issues
  if (!projectData || !projectActions) {
    console.log('ProjectProvider: Waiting for contexts to initialize...', { projectData: !!projectData, projectActions: !!projectActions });
    return <div>Loading...</div>;
  }

  const {
    projects,
    projectRuns,
    loading,
    refetchProjects,
    refetchProjectRuns
  } = projectData;

  const {
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
  } = projectActions;

  console.log('ProjectProvider: Successfully initialized with data');

  const value = {
    projects,
    projectRuns,
    currentProject,
    currentProjectRun,
    isAdmin,
    loading,
    setCurrentProject,
    setCurrentProjectRun,
    addProject,
    createProjectRun,
    addProjectRun,
    updateProject,
    updateProjectRun,
    deleteProject,
    deleteProjectRun,
    fetchProjects: refetchProjects,
    fetchProjectRuns: refetchProjectRuns,
    refreshProjectRunFromTemplate
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};