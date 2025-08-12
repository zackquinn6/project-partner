import { Project } from './Project';

export interface ProjectRun {
  id: string;
  templateId: string; // Reference to the template project
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  planEndDate: Date;
  endDate?: Date;
  status: 'not-started' | 'in-progress' | 'complete';
  
  // User customization data
  projectLeader?: string;
  accountabilityPartner?: string;
  customProjectName?: string;
  
  // Runtime data
  currentPhaseId?: string;
  currentOperationId?: string;
  currentStepId?: string;
  completedSteps: string[];
  progress: number; // 0-100
  
  // Copy of template data at time of creation (for consistency)
  phases: Project['phases'];
  category?: string;
  difficulty?: Project['difficulty'];
  estimatedTime?: string;
}