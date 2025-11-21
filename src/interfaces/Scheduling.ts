export type PlanningMode = 'quick' | 'standard' | 'detailed';
export type ScheduleTempo = 'extended' | 'steady' | 'fast_track';
export type TaskStatus = 'confirmed' | 'tentative' | 'conflict';
export type RemediationType = 'add_helper' | 'allow_night_work' | 'extend_date';

export interface Task {
  id: string;
  title: string;
  estimatedHours: number;
  minContiguousHours: number;
  dependencies: string[];
  tags: string[];
  confidence?: number; // 0-1 scale
  phaseId?: string;
  operationId?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  workerId: string;
  isAvailable: boolean;
}

export interface Worker {
  id: string;
  name: string;
  type: 'owner' | 'helper';
  skillLevel: 'novice' | 'intermediate' | 'expert';
  availability: TimeSlot[];
  costPerHour?: number;
  email?: string;
  phone?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
  };
}

export interface SiteConstraints {
  allowedWorkHours: {
    weekdays: { start: string; end: string };
    weekends: { start: string; end: string };
  };
  weekendsOnly: boolean;
  allowNightWork: boolean;
  noiseCurfew?: string; // Time after which noisy work is not allowed
}

export interface SchedulingInputs {
  targetCompletionDate: Date;
  dropDeadDate?: Date;
  timezone: string;
  tasks: Task[];
  workers: Worker[];
  siteConstraints: SiteConstraints;
  blackoutDates: Date[];
  scheduleTempo: ScheduleTempo;
  preferHelpers: boolean;
  mode: PlanningMode;
  completionPriority?: 'agile' | 'waterfall'; // Agile: complete space end-to-end, Waterfall: complete phase across all spaces
}

export interface ScheduledTask {
  taskId: string;
  workerId: string;
  startTime: Date;
  endTime: Date;
  targetCompletionDate: Date;
  latestCompletionDate: Date;
  status: TaskStatus;
  bufferApplied: number; // Percentage buffer added
  isManualEdit?: boolean;
}

export interface SchedulingResult {
  scheduledTasks: ScheduledTask[];
  criticalPath: string[];
  totalDuration: number; // hours
  remediations: RemediationSuggestion[];
  warnings: string[];
  slackTimes: Record<string, number>; // taskId -> slack hours
}

export interface RemediationSuggestion {
  type: RemediationType;
  description: string;
  impact: {
    timeSaved: number; // hours
    costEstimate?: number;
    feasibilityScore: number; // 0-1
  };
  preview?: SchedulingResult; // What-if result
}

export interface CureDryWindow {
  afterTaskId: string;
  minimumHours: number;
  description: string;
}

export interface SchedulingHeuristics {
  bufferMapping: {
    [confidenceRange: string]: number; // confidence range -> buffer percentage
  };
  nightWorkPenalty: number; // productivity penalty for night work
  helperEfficiency: {
    single: number; // efficiency gain with one helper
    diminishingReturns: number; // reduced gains for additional helpers
  };
  phaseBuffer: {
    lowConfidenceThreshold: number;
    bufferBlocks: number; // number of time blocks to add between phases
  };
}