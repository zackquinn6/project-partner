// Legacy interfaces for embedded materials/tools (deprecated)
export interface Material {
  id: string;
  name: string;
  description: string;
  category: 'Hardware' | 'Software' | 'Consumable' | 'Other';
  required: boolean;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'Hardware' | 'Software' | 'Hand Tool' | 'Power Tool' | 'Other';
  required: boolean;
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
}

export interface ContentSection {
  id: string;
  type: 'text' | 'image' | 'video' | 'link';
  content: string;
  title?: string;
  width?: 'full' | 'half' | 'third' | 'two-thirds';
  alignment?: 'left' | 'center' | 'right';
}

export interface WorkflowStep {
  id: string;
  step: string;
  description: string;
  contentType: 'text' | 'video' | 'image' | 'document';
  content: string;
  image?: string;
  materials: Material[];
  tools: Tool[];
  outputs: Output[];
  contentSections?: ContentSection[];
}

export interface Operation {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  operations: Operation[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  planEndDate: Date;
  endDate?: Date;
  status: 'not-started' | 'in-progress' | 'complete';
  publishStatus: 'draft' | 'published' | 'beta-testing';
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  effortLevel?: 'Low' | 'Medium' | 'High';
  estimatedTime?: string;
  estimatedTimePerUnit?: number;
  scalingUnit?: 'per square foot' | 'per 10x10 room' | 'per linear foot' | 'per cubic yard' | 'per item';
  phases: Phase[];
}