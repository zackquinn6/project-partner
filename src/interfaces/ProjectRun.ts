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
  
  // Analytics data
  phase_ratings?: Array<{
    phaseId: string;
    phaseName: string;
    rating: number; // 1-5
    timestamp: string;
  }>;
  issue_reports?: Array<{
    stepId: string;
    phaseId: string;
    phaseName: string;
    step: string;
    issues: Record<string, boolean>;
    comments: string;
    timestamp: string;
  }>;
  
  // Time tracking data
  time_tracking?: {
    phases?: Record<string, {
      startTime?: string;
      endTime?: string;
      totalTime?: number; // in minutes
    }>;
    operations?: Record<string, {
      startTime?: string;
      endTime?: string;
      totalTime?: number; // in minutes
    }>;
    steps?: Record<string, {
      startTime?: string;
      endTime?: string;
      totalTime?: number; // in minutes
    }>;
  };
  
  // Survey data
  survey_data?: {
    satisfaction: number; // 1-5
    confidenceChallenges: string;
    improvementSuggestions: string;
    submittedAt: string;
  };
}