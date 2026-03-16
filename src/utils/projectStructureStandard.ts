export type ProjectLevel = 'phase' | 'operation' | 'step' | 'action';

export interface ProjectLevelDefinition {
  name: string;
  description: string;
  purpose: string;
  contains: string;
  durationTypical?: string;
  durationMax?: string;
  countRules?: string;
  mustRules: string[];
  examples?: string[];
}

export interface TimeStandard {
  level: ProjectLevel;
  typicalDuration: string;
  maxDuration: string;
  notes: string;
}

export interface ToolioProjectStructureStandard {
  summary: string;
  hierarchy: string[];
  levels: Record<ProjectLevel, ProjectLevelDefinition>;
  timeStandards: TimeStandard[];
  stepRequirements: string[];
}

export const TOOLIO_PROJECT_STRUCTURE_STANDARD: ToolioProjectStructureStandard = {
  summary:
    'TOOLIO PROJECT STRUCTURE — QUICK REFERENCE STANDARD. This standard defines what belongs at each level, how long each level should be, and the structural limits for every project.',
  hierarchy: ['Phase → Operation → Step → Action'],
  levels: {
    phase: {
      name: 'Phase',
      description: 'Major milestone with a natural stopping point.',
      purpose: 'Organize the project into big, sequential chunks.',
      contains: 'No instructions.',
      durationTypical: '½–1 day',
      durationMax: '1 day',
      countRules: 'Unlimited phases per project (typical: 2–5).',
      mustRules: [
        'Represent a meaningful shift in the project.',
        'Have a clear “before/after” state.',
        'Allow a natural pause (you can stop for hours or overnight).',
        'Change tools, materials, or skill type.'
      ],
      examples: ['Removal → Install', 'Prep → Prime → Paint → Finish → Cleanup']
    },
    operation: {
      name: 'Operation',
      description: 'A distinct task inside a phase that produces a specific outcome.',
      purpose: 'Break phases into teachable, outcome-based tasks.',
      contains: 'No instructions.',
      durationTypical: '1–3 hours',
      durationMax: '4 hours',
      countRules: 'Maximum 10 operations per phase.',
      mustRules: [
        'Produce a clear, observable result.',
        'Be teachable as a standalone skill.',
        'Use a consistent tool/material set.',
        'Not require stopping mid operation.'
      ],
      examples: ['Set toilet', 'Connect water', 'Patch walls', 'Cut in edges']
    },
    step: {
      name: 'Step',
      description: 'The instructional unit — everything the user needs to complete one part of an operation.',
      purpose: 'Deliver complete, actionable guidance.',
      contains: 'Instructions (Actions) with full metadata.',
      durationTypical: '5–30 minutes (standard step).',
      durationMax: '60 minutes (standard or scaled step).',
      countRules: 'Maximum 10 steps per operation.',
      mustRules: [
        'Include all required instructional metadata as defined in the standard.',
        'Be completable without splitting across multiple sessions in normal conditions.'
      ],
      examples: []
    },
    action: {
      name: 'Action',
      description: 'Micro instruction representing a single motion or micro-task.',
      purpose: 'Describe the smallest unit of observable work.',
      contains: 'One motion or micro instruction inside a step.',
      durationTypical: 'Minutes.',
      durationMax: 'Minutes.',
      countRules: 'Defined within a single step; not tracked independently at the project level.',
      mustRules: [
        'Be specific and observable (e.g., “Turn wrench ¼ turn”).',
        'Be written so a user can complete it in one continuous motion or focus block.'
      ],
      examples: ['Turn wrench ¼ turn', 'Feather brush outward', 'Press evenly']
    }
  },
  timeStandards: [
    {
      level: 'phase',
      typicalDuration: '½–1 day',
      maxDuration: '1 day',
      notes: 'Natural stopping point.'
    },
    {
      level: 'operation',
      typicalDuration: '1–3 hours',
      maxDuration: '4 hours',
      notes: 'Produces a specific outcome.'
    },
    {
      level: 'step',
      typicalDuration: '5–30 minutes',
      maxDuration: '60 minutes',
      notes: 'Atomic instructional unit.'
    },
    {
      level: 'action',
      typicalDuration: 'Minutes',
      maxDuration: 'Minutes',
      notes: 'One motion.'
    }
  ],
  stepRequirements: [
    'Instructions (Actions) with visual aids.',
    'Warnings.',
    'PPE list.',
    'Tool list.',
    'Material list.',
    'Inputs (factors that matter).',
    'Outputs (observable success criteria).',
    'Time estimate.',
    'Common mistakes.',
    'Variations / branching logic.',
    'Quality checks.',
    'Cleanup requirements.'
  ]
};

