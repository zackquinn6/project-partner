import { Project } from './Project';

/**
 * Project run (user's instance of a project).
 *
 * Schema: maps to Supabase table `project_runs`.
 * - id, template_id, name, description, project_challenges, is_manual_entry
 * - created_at, updated_at, start_date, plan_end_date, end_date, status
 * - project_leader, accountability_partner, custom_project_name, home_id
 * - current_phase_id, current_operation_id, current_step_id
 * - completed_steps (JSONB array), progress
 * - phases (JSONB; immutable snapshot from template at creation)
 * - category, effort_level, skill_level, estimated_time, scaling_unit
 * - budget_data, phase_ratings, issue_reports, time_tracking (JSONB)
 * - customization_decisions (JSONB), instruction_level_preference
 * - initial_budget, initial_timeline, initial_sizing
 * - progress_reporting_style, schedule_optimization_method
 * - schedule_events, project_photos, shopping_checklist_data (JSONB)
 */
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
      itemType?: 'tool' | 'material';
    }>;
    completedDate?: string;
    /**
     * Project-specific material lead times.
     * Keyed by `material.id` as used in the shopping checklist.
     */
    materialLeadTimes?: Record<string, number>;
  };

  // Step notes saved for the workflow (JSONB mapping stepId -> note text)
  notes_data?: Record<string, string>;

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
  schedule_optimization_method?: 'single-piece-flow' | 'batch-flow'; // Workflow navigation method: single-piece-flow (default) processes one space at a time through custom phases; batch-flow processes all spaces through one phase before moving to the next
  progress_reporting_style?: 'linear' | 'exponential' | 'time-based'; // Progress calculation method: linear (step count), exponential (weighted), or time-based (uses time estimates)
}