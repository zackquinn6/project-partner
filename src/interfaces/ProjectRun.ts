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
  stepCompletionPercentages?: Record<string, number>; // stepId -> percentage (0-100)
  progress: number; // 0-100
  
  // Copy of template data at time of creation (for consistency)
  phases: Project['phases'];
  category?: string;
  effortLevel?: Project['effortLevel'];
  skillLevel?: Project['skillLevel'];
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

  // Advanced Features Data
  skill_profile?: {
    skillLevel: 'novice' | 'intermediate' | 'expert';
    learningStyle: 'visual' | 'hands-on' | 'detailed' | 'quick-reference';
    completionTimes: Record<string, number>;
    confidenceRatings: Record<string, number>;
    preferredGuidanceLevel: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
  };

  // Project Sizing Data
  projectSize?: string;
  scalingFactor?: number;
  scalingUnit?: string;
  complexityAdjustments?: string;
  skillLevelMultiplier?: number;
  availableHoursPerDay?: number;
  workingDaysPerWeek?: number;
  specialConsiderations?: string;

  delay_detection?: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    predictedDelay: number; // days
    delayFactors: string[];
    lastAnalyzed: string;
  };

  feedback_data?: Array<{
    stepId: string;
    type: 'quick' | 'detailed';
    rating: number;
    issues: string[];
    suggestions: string;
    timestamp: string;
  }>;

  weather_alerts?: Array<{
    type: 'rain' | 'snow' | 'extreme-cold' | 'extreme-heat';
    severity: 'watch' | 'warning' | 'advisory';
    affectedPhases: string[];
    recommendations: string[];
    alertDate: string;
  }>;

  workflow_optimizations?: Array<{
    type: 'step-reorder' | 'tool-consolidation' | 'time-reduction';
    description: string;
    timeSavings: number; // minutes
    applied: boolean;
    appliedDate?: string;
  }>;

  calendar_integration?: {
    scheduledDays: Record<string, {
      date: string;
      timeSlots: Array<{
        startTime: string;
        endTime: string;
        phaseId?: string;
        operationId?: string;
      }>;
    }>;
    preferences: {
      preferredStartTime: string;
      maxHoursPerDay: number;
      preferredDays: number[];
    };
  };

  project_photos?: {
    before: Array<{
      id: string;
      url: string;
      caption?: string;
      uploadedAt: string;
    }>;
    during: Array<{
      id: string;
      url: string;
      caption?: string;
      uploadedAt: string;
    }>;
    after: Array<{
      id: string;
      url: string;
      caption?: string;
      uploadedAt: string;
    }>;
  };
}