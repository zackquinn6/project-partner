import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '@/interfaces/Project';

// Import placeholder images
import interiorPaintingPlaceholder from '@/assets/interior-painting-placeholder.jpg';
import tileFlooringPlaceholder from '@/assets/tile-flooring-placeholder.jpg';
import lvpFlooringPlaceholder from '@/assets/lvp-flooring-placeholder.jpg';
import tileBacksplashPlaceholder from '@/assets/tile-backsplash-placeholder.jpg';
import landscapingPlaceholder from '@/assets/landscaping-placeholder.jpg';
import powerWashingPlaceholder from '@/assets/power-washing-placeholder.jpg';
import smartHomePlaceholder from '@/assets/smart-home-placeholder.jpg';
import drywallPlaceholder from '@/assets/drywall-placeholder.jpg';
import lightingPlaceholder from '@/assets/lighting-placeholder.jpg';
import homeMaintenancePlaceholder from '@/assets/home-maintenance-placeholder.jpg';

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
    // Template projects from catalog (published status)
    {
      id: 'template-interior-painting',
      name: 'Interior Painting',
      description: 'Transform your space with professional interior painting techniques',
      image: interiorPaintingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Interior',
      difficulty: 'Beginner',
      estimatedTime: '2-3 days',
      phases: []
    },
    {
      id: 'template-tile-flooring',
      name: 'Tile Flooring',
      description: 'Complete tile flooring installation from planning to finish',
      image: tileFlooringPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Flooring',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 weeks',
      phases: [
        {
          id: 'plan-phase',
          name: 'Plan',
          description: 'Planning and preparation phase for tile installation',
          operations: [
            {
              id: 'pick-materials-op',
              name: 'Pick Materials',
              description: 'Select and calculate all materials needed for the project',
              steps: [
                {
                  id: 'measure-space',
                  step: 'Measure Space',
                  description: 'Accurately measure the room dimensions and calculate square footage',
                  contentType: 'text',
                  content: 'Measure length and width of each room. Account for closets, alcoves, and irregular spaces. Add 10% waste factor.',
                  materials: [
                    { id: 'm1', name: 'Measuring Tape', description: '25ft tape measure', category: 'Hardware', required: true },
                    { id: 'm2', name: 'Graph Paper', description: 'For sketching layout', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't1', name: 'Calculator', description: 'For square footage calculations', category: 'Other', required: true },
                    { id: 't2', name: 'Pencil', description: 'For marking measurements', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o1', name: 'Room Measurements', description: 'Accurate room dimensions', type: 'performance-durability', potentialEffects: 'Incorrect material orders, project delays', photosOfEffects: 'measurement-errors.jpg', mustGetRight: 'Precise measurements within 1/4 inch', qualityChecks: 'Double-check all measurements' },
                    { id: 'o2', name: 'Layout Sketch', description: 'Hand-drawn room layout', type: 'none' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'template-lvp-flooring',
      name: 'LVP Flooring',
      description: 'Luxury vinyl plank flooring installation made simple',
      image: lvpFlooringPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Flooring',
      difficulty: 'Beginner',
      estimatedTime: '3-5 days',
      phases: []
    },
    {
      id: 'template-tile-backsplash',
      name: 'Tile Backsplash',
      description: 'Add style and protection with a beautiful tile backsplash',
      image: tileBacksplashPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Kitchen',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 days',
      phases: []
    },
    {
      id: 'template-landscaping',
      name: 'Landscaping',
      description: 'Design and create beautiful outdoor spaces',
      image: landscapingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Exterior',
      difficulty: 'Intermediate',
      estimatedTime: '1-3 weeks',
      phases: []
    },
    {
      id: 'template-power-washing',
      name: 'Power Washing',
      description: 'Restore surfaces with proper power washing techniques',
      image: powerWashingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Exterior',
      difficulty: 'Beginner',
      estimatedTime: '1 day',
      phases: []
    },
    {
      id: 'template-smart-home',
      name: 'Smart Home',
      description: 'Install and configure smart home automation systems',
      image: smartHomePlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Technology',
      difficulty: 'Advanced',
      estimatedTime: '1-2 weeks',
      phases: []
    },
    {
      id: 'template-drywall',
      name: 'Drywall',
      description: 'Master drywall installation and finishing techniques',
      image: drywallPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Interior',
      difficulty: 'Intermediate',
      estimatedTime: '1 week',
      phases: []
    },
    {
      id: 'template-lighting',
      name: 'Lighting',
      description: 'Install and upgrade lighting fixtures safely',
      image: lightingPlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Electrical',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 days',
      phases: []
    },
    {
      id: 'template-home-maintenance',
      name: 'Home Maintenance',
      description: 'Essential maintenance tasks to keep your home in top condition',
      image: homeMaintenancePlaceholder,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date(),
      planEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'not-started' as const,
      publishStatus: 'published' as const,
      category: 'Maintenance',
      difficulty: 'Beginner',
      estimatedTime: 'Ongoing',
      phases: []
    },
    // Legacy project with full workflow (keep for demo purposes)
    {
      id: 'demo-tile-flooring',
      name: 'Tile Flooring Install (Demo)',
      description: 'Complete tile flooring installation project from planning to finish - with full workflow',
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: new Date('2024-02-01'),
      planEndDate: new Date('2024-03-15'),
      status: 'not-started' as const,
      publishStatus: 'draft' as const,
      category: 'Flooring',
      difficulty: 'Intermediate',
      estimatedTime: '1-2 weeks',
      phases: [
        {
          id: 'plan-phase',
          name: 'Plan',
          description: 'Planning and preparation phase for tile installation',
          operations: [
            {
              id: 'pick-materials-op',
              name: 'Pick Materials',
              description: 'Select and calculate all materials needed for the project',
              steps: [
                {
                  id: 'measure-space',
                  step: 'Measure Space',
                  description: 'Accurately measure the room dimensions and calculate square footage',
                  contentType: 'text',
                  content: 'Measure length and width of each room. Account for closets, alcoves, and irregular spaces. Add 10% waste factor.',
                  materials: [
                    { id: 'm1', name: 'Measuring Tape', description: '25ft tape measure', category: 'Hardware', required: true },
                    { id: 'm2', name: 'Graph Paper', description: 'For sketching layout', category: 'Consumable', required: true }
                  ],
                  tools: [
                    { id: 't1', name: 'Calculator', description: 'For square footage calculations', category: 'Other', required: true },
                    { id: 't2', name: 'Pencil', description: 'For marking measurements', category: 'Other', required: true }
                  ],
                  outputs: [
                    { id: 'o1', name: 'Room Measurements', description: 'Accurate room dimensions', type: 'performance-durability', potentialEffects: 'Incorrect material orders, project delays', photosOfEffects: 'measurement-errors.jpg', mustGetRight: 'Precise measurements within 1/4 inch', qualityChecks: 'Double-check all measurements' },
                    { id: 'o2', name: 'Layout Sketch', description: 'Hand-drawn room layout', type: 'none' }
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