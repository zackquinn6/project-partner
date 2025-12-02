import { Project } from './Project';

export interface ProjectRun {
  id: string;
  templateId: string; // Reference to the template project
  name: string;
  description: string;
  projectChallenges?: string; // Copied from template project
  isManualEntry?: boolean; // True for user-uploaded manual project entries
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  planEndDate: Date;
  endDate?: Date;
  status: 'not-started' | 'in-progress' | 'complete' | 'cancelled';
  
  // User customization data
  projectLeader?: string;
  accountabilityPartner?: string;
  customProjectName?: string;
  home_id?: string; // Reference to the home where this project is being done
  
  // Runtime data
  currentPhaseId?: string;
  currentOperationId?: string;
  currentStepId?: string;
  completedSteps: string[];
  stepCompletionPercentages?: Record<string, number>; // stepId -> percentage (0-100)
  progress: number; // 0-100
  
  // Copy of template data at time of creation (for consistency)
  phases: Project['phases'];
  category?: string[];
  effortLevel?: Project['effortLevel'];
  skillLevel?: Project['skillLevel'];
  estimatedTime?: string;
  
  // Budget tracking data
  budget_data?: {
    lineItems: Array<{
      id: string;
      section: string;
      item: string;
      budgetedAmount: number;
      actualAmount: number;
      category: 'material' | 'labor' | 'other';
      notes?: string;
    }>;
    actualEntries: Array<{
      id: string;
      lineItemId?: string;
      description: string;
      amount: number;
      date: string;
      category: 'material' | 'labor' | 'other';
      receiptUrl?: string;
      notes?: string;
    }>;
    lastUpdated: string;
  };
  
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

  // App-specific data storage
  shopping_checklist_data?: {
    orderedItems: Array<{
      itemId: string;
      itemName: string;
      orderedDate: string;
      vendor?: string;
    }>;
    completedDate?: string;
  };

  schedule_events?: {
    events: Array<{
      id: string;
      date: string;
      phaseId: string;
      operationId?: string;
      duration: number;
      notes: string;
      assignedTo?: string;
    }>;
    teamMembers: Array<{
      id: string;
      name: string;
      skillLevel: string;
    }>;
    globalSettings: {
      quietHours?: {
        start: string;
        end: string;
      };
    };
  };

  customization_decisions?: {
    standardDecisions: Record<string, string[]>;
    ifNecessaryWork: Record<string, string[]>;
    customPlannedWork: any[];
    customUnplannedWork: any[];
    workflowOrder: string[];
  };

  // Detail level preference
  instruction_level_preference?: 'beginner' | 'intermediate' | 'advanced';

  // Initial project data from kickoff step 3
  initial_budget?: string;
  initial_timeline?: string; // ISO date string
  initial_sizing?: string; // Initial project size entered at kickoff
  completion_priority?: 'agile' | 'waterfall'; // Scheduling algorithm: agile (complete space end-to-end) or waterfall (complete phase across all spaces)
  progress_reporting_style?: 'linear' | 'exponential' | 'time-based'; // Progress calculation method: linear (step count), exponential (weighted), or time-based (uses time estimates)
}