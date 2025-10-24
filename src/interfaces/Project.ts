// Legacy interfaces for embedded materials/tools (deprecated)
export interface Material {
  id: string;
  name: string;
  description: string;
  category: 'Hardware' | 'Software' | 'Consumable' | 'Other';
  alternates: string[];
  unit?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'Hardware' | 'Software' | 'Hand Tool' | 'Power Tool' | 'Other';
  alternates: string[];
}

// New library interfaces matching database schema
export interface LibraryTool {
  id: string;
  item: string;
  description: string | null;
  example_models: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LibraryMaterial {
  id: string;
  item: string;
  description: string | null;
  unit_size: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

// Workflow step references for library items
export interface ToolReference {
  library_tool_id: string;
  quantity?: number;
  notes?: string;
}

export interface MaterialReference {
  library_material_id: string;
  quantity?: number;
  notes?: string;
}

export interface Output {
  id: string;
  name: string;
  description: string;
  type: 'none' | 'major-aesthetics' | 'performance-durability' | 'safety';
  requirement?: string;
  potentialEffects?: string;
  photosOfEffects?: string;
  keyInputs?: string[];
  qualityChecks?: string;
  mustGetRight?: string;
  allowances?: string;
  referenceSpecification?: string;
}

export interface AppReference {
  id: string;
  appName: string;
  appType: 'native' | 'external-embed' | 'external-link';
  icon: string;
  description?: string;
  actionKey?: string;
  embedUrl?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  displayOrder?: number;
  isBeta?: boolean;
}

export interface ContentSection {
  id: string;
  type: 'text' | 'image' | 'video' | 'link' | 'button' | 'safety-warning';
  content: string;
  title?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical'; // For safety-warning type
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  alignment?: 'left' | 'center' | 'right';
  // Button-specific properties
  buttonAction?: 'project-customizer' | 'project-scheduler' | 'shopping-checklist' | 'materials-selection';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary';
}

// Decision point interface for workflow branching
export interface DecisionPoint {
  id: string;
  question: string;
  description?: string;
  options: DecisionOption[];
  allowFreeText?: boolean;
  stage: 'initial-planning' | 'final-planning' | 'execution';
}

export interface DecisionOption {
  id: string;
  label: string;
  value: string;
  nextStepId?: string;
  alternateStepId?: string;
}

export interface StepInput {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'number' | 'boolean' | 'file' | 'measurement' | 'selection' | 'upstream';
  required?: boolean;
  options?: string[]; // For selection type
  unit?: string; // For measurement type
  sourceStepId?: string; // For upstream type - which step created this variable
  sourceStepName?: string; // For upstream type - display name of source step
  targetValue?: string; // For upstream type - expected value or range
}

export interface WorkflowStep {
  id: string;
  step: string;
  description: string;
  contentType: 'text' | 'video' | 'image' | 'document' | 'multi';
  content: string | ContentSection[];
  image?: string;
  materials: Material[];
  tools: Tool[];
  outputs: Output[];
  inputs?: StepInput[]; // Admin-defined inputs for this step
  contentSections?: ContentSection[];
  apps?: AppReference[]; // Interactive apps for this step
  flowType?: 'prime' | 'repeat' | 'inspection' | 'alternate' | 'if-necessary';
  // Decision tree fields
  isDecisionPoint?: boolean;
  decisionPoint?: DecisionPoint;
  alternateStepId?: string; // For alternate flowType steps
  condition?: string; // Condition that must be met for this step to be executed
  timeEstimation?: {
    variableTime?: {
      low: number; // hours per scaling unit
      medium: number;
      high: number;
    };
    lagTime?: {
      low: number; // hours
      medium: number;
      high: number;
    };
  };
  // Standard content flag - marks steps from Standard Project Foundation
  isStandard?: boolean;
}

export interface Operation {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  // Standard content flag - marks operations from Standard Project Foundation
  isStandard?: boolean;
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  operations: Operation[];
  // Linked phase properties
  isLinked?: boolean;
  sourceProjectId?: string;
  sourceProjectName?: string;
  incorporatedRevision?: number;
  // Standard phase flag - marks phases that shouldn't be edited in non-standard projects
  isStandard?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  diyLengthChallenges?: string; // Admin-defined field explaining most difficult aspects
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  planEndDate: Date;
  endDate?: Date;
  status: 'not-started' | 'in-progress' | 'complete';
  publishStatus?: 'draft' | 'published' | 'beta-testing' | 'archived';
  category?: string;
  effortLevel?: 'Low' | 'Medium' | 'High';
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime?: string;
  estimatedTimePerUnit?: number;
  scalingUnit?: 'per square foot' | 'per 10x10 room' | 'per linear foot' | 'per cubic yard' | 'per item';
  phases: Phase[];
  // Revision tracking fields
  revisionNumber?: number;
  parentProjectId?: string;
  revisionNotes?: string;
  createdFromRevision?: number;
  // Standard Project Foundation marker
  isStandardTemplate?: boolean;
}