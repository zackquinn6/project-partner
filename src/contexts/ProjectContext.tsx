import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
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
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Software Development Project',
      description: 'Complete software development lifecycle',
      createdAt: new Date(),
      updatedAt: new Date(),
      phases: [
        {
          id: '1',
          name: 'Discovery',
          description: 'Project discovery and planning phase',
          operations: [
            {
              id: '1',
              name: 'Requirements Gathering',
              description: 'Collect and document project requirements',
              steps: [
                {
                  id: '1',
                  step: 'Stakeholder Interviews',
                  description: 'Conduct interviews with key stakeholders',
                  contentType: 'text',
                  content: 'Schedule and conduct 1-on-1 interviews with each stakeholder',
                  materials: [
                    { id: '1', name: 'Interview Template', description: 'Standardized questions', category: 'Other', required: true }
                  ],
                  tools: [
                    { id: '1', name: 'Recording Device', description: 'Digital recorder', category: 'Hardware', required: false },
                    { id: '2', name: 'Video Conferencing', description: 'Zoom, Teams, or similar', category: 'Software', required: true }
                  ],
                  outputs: [
                    { id: '1', name: 'Interview Notes', description: 'Documented responses', type: 'none' },
                    { id: '2', name: 'Requirements List', description: 'Initial requirements list', type: 'performance-durability', potentialEffects: 'Project delays, scope creep', photosOfEffects: 'timeline-issues.jpg', mustGetRight: 'Complete stakeholder buy-in', qualityChecks: 'Review with all stakeholders' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]);
  
  const [currentProject, setCurrentProject] = useState<Project | null>(projects[0] || null);

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    );
    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(updatedProject);
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    if (currentProject?.id === projectId) {
      const remainingProjects = projects.filter(p => p.id !== projectId);
      setCurrentProject(remainingProjects[0] || null);
    }
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      setCurrentProject,
      addProject,
      updateProject,
      deleteProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};