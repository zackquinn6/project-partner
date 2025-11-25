import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { enforceStandardPhaseOrdering } from './phaseOrderingUtils';

export const createKickoffPhase = (): Phase => {
  const kickoffSteps: WorkflowStep[] = [
    {
      id: 'kickoff-step-1',
      step: 'DIY Profile',
      description: 'Complete your DIY profile for personalized project guidance',
      contentType: 'text' as const,
      content: 'Set up your DIY profile to receive personalized project recommendations, tool suggestions, and guidance tailored to your skill level and preferences.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'diy-profile-output',
        name: 'DIY Profile Complete',
        description: 'Personal DIY profile completed and saved',
        type: 'none' as const
      }]
    },
    {
      id: 'kickoff-step-2',
      step: 'Project Overview',
      description: 'Review and customize your project details, timeline, and objectives',
      contentType: 'text' as const,
      content: 'This is your project overview step. Review all project details and make any necessary customizations before proceeding.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'overview-output',
        name: 'Project Overview Complete',
        description: 'Project details reviewed and customized',
        type: 'none' as const
      }]
    },
    {
      id: 'kickoff-step-3',
      step: 'Project Profile',
      description: 'Set up your project team, home selection, and customization',
      contentType: 'text' as const,
      content: 'Configure your project profile including project name, team members, home selection, and any project-specific customizations.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'project-profile-output',
        name: 'Project Profile Complete',
        description: 'Project profile configured and saved',
        type: 'none' as const
      }]
    }
  ];

  const kickoffOperation: Operation = {
    id: 'kickoff-operation',
    name: 'Kickoff',
    description: 'Essential project setup and agreement',
    steps: kickoffSteps
  };

  const kickoffPhase: Phase = {
    id: 'kickoff-phase',
    name: 'Kickoff',
    description: 'Essential project setup and agreement',
    operations: [kickoffOperation],
    isStandard: true
  };

  return kickoffPhase;
};

export const createPlanningPhase = (): Phase => {
  const initialPlanningOperation: Operation = {
    id: 'initial-planning-operation',
    name: 'Initial Planning',
    description: 'Define project scope and select phases',
    steps: [{
      id: 'planning-step-1',
      step: 'Project Work Scope',
      description: 'Define project scope, measurements, timing, and customize workflow',
      contentType: 'text' as const,
      content: 'Complete the project sizing questionnaire and customize your project workflow by selecting phases from our library or creating custom phases.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'scope-output',
        name: 'Project Scope Defined',
        description: 'Project scope, timing, and workflow customized',
        type: 'none' as const
      }]
    }]
  };

  const measurementOperation: Operation = {
    id: 'measurement-operation',
    name: 'Measure & Assess',
    description: 'Measure spaces and assess project requirements',
    steps: [{
      id: 'measurement-step-1',
      step: 'Site Measurement',
      description: 'Take accurate measurements of your work area',
      contentType: 'text' as const,
      content: 'Measure your work area carefully and document all dimensions needed for your project.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'measurement-output',
        name: 'Measurements Complete',
        description: 'All necessary measurements documented',
        type: 'none' as const
      }]
    }]
  };

  const finalPlanningOperation: Operation = {
    id: 'final-planning-operation',
    name: 'Final Planning',
    description: 'Finalize project details and create execution plan',
    steps: [{
      id: 'final-planning-step-1',  
      step: 'Finalize Project Plan',
      description: 'Review and finalize all project details and timeline',
      contentType: 'text' as const,
      content: 'Review your project plan, confirm all details, and create your final execution timeline.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'final-planning-output',
        name: 'Project Plan Finalized',
        description: 'Project ready for execution',
        type: 'none' as const
      }]
    }]
  };

  const projectCustomizerOperation: Operation = {
    id: 'project-customizer-operation',
    name: 'Scope Builder',
    description: 'Define project size and customize for unique rooms and spaces',
    steps: [{
      id: 'planning-step-2',
      step: 'Project Customizer',
      description: 'Customize your project workflow, phases, and decision points',
      contentType: 'multi' as const,
      content: [
        {
          id: 'customizer-text',
          type: 'text',
          content: 'Use the Project Customizer to review and modify your project phases, customize the workflow, and set up decision points based on your specific needs.'
        },
        {
          id: 'customizer-button',
          type: 'button',
          content: '',
          buttonAction: 'project-customizer',
          buttonLabel: 'Scope Builder',
          buttonIcon: 'HelpCircle',
          buttonVariant: 'outline'
        }
      ],
      materials: [],
      tools: [],
      outputs: [{
        id: 'customizer-output',
        name: 'Project Customized',
        description: 'Project workflow and phases customized',
        type: 'none' as const
      }]
    }]
  };

  const projectSchedulingOperation: Operation = {
    id: 'project-scheduling-operation',
    name: 'Project Scheduler',
    description: 'Create project timeline and schedule phases',
    steps: [{
      id: 'planning-step-3',
      step: 'Project Scheduler',
      description: 'Create project timeline and schedule phases',
      contentType: 'multi' as const,
      content: [
        {
          id: 'scheduler-text',
          type: 'text',
          content: 'Use the Project Scheduler to plan your project timeline, set realistic deadlines, coordinate with your calendar, and establish a practical work schedule.'
        },
        {
          id: 'scheduler-button',
          type: 'button',
          content: '',
          buttonAction: 'project-scheduler',
          buttonLabel: 'Timekeeper',
          buttonIcon: 'Calendar',
          buttonVariant: 'outline'
        }
      ],
      materials: [],
      tools: [],
      outputs: [{
        id: 'scheduling-output',
        name: 'Project Scheduled',
        description: 'Project timeline and schedule established',
        type: 'none' as const
      }]
    }]
  };

  const planningPhase: Phase = {
    id: 'planning-phase',
    name: 'Planning',
    description: 'Comprehensive project planning and preparation',
    operations: [initialPlanningOperation, measurementOperation, finalPlanningOperation, projectCustomizerOperation, projectSchedulingOperation],
    isStandard: true
  };

  return planningPhase;
};

export const createOrderingPhase = (): Phase => {
  const shoppingChecklistOperation: Operation = {
    id: 'shopping-checklist-operation',
    name: 'Shopping Checklist',
    description: 'Review and prepare shopping checklist',
    steps: [{
      id: 'ordering-step-1',
      step: 'Shopping Checklist',
      description: 'Review and prepare complete shopping checklist for tools and materials',
      contentType: 'multi' as const,
      content: [
        {
          id: 'checklist-text',
          type: 'text',
          content: 'Use the Shopping Checklist to review all required tools and materials, compare prices, and prepare for your shopping trip or online orders.'
        },
        {
          id: 'checklist-button',
          type: 'button',
          content: '',
          buttonAction: 'shopping-checklist',
          buttonLabel: 'Shopping Checklist',
          buttonIcon: 'ShoppingCart',
          buttonVariant: 'outline'
        }
      ],
      materials: [],
      tools: [],
      outputs: [{
        id: 'checklist-output',
        name: 'Shopping Checklist Prepared',
        description: 'Complete shopping checklist prepared and reviewed',
        type: 'none' as const
      }]
    }]
  };

  const orderingOperation: Operation = {
    id: 'ordering-operation',
    name: 'Tool & Material Ordering',
    description: 'Order all project tools and materials',
    steps: [{
      id: 'ordering-step-2',
      step: 'Tool & Material Ordering',
      description: 'Order all required tools and materials for your project using the integrated shopping browser',
      contentType: 'text' as const,
      content: 'Use our integrated shopping browser to purchase all required tools and materials for your project. Our system will help you find the best prices and ensure you get everything you need.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'ordering-output',
        name: 'All Items Ordered',
        description: 'All required tools and materials have been ordered',
        type: 'none' as const
      }]
    }]
  };

  const orderingPhase: Phase = {
    id: 'ordering-phase',
    name: 'Ordering',
    description: 'Order all required tools and materials for the project',
    operations: [shoppingChecklistOperation, orderingOperation],
    isStandard: true
  };

  return orderingPhase;
};

export const createCloseProjectPhase = (): Phase => {
  const toolMaterialProcessingOperation: Operation = {
    id: 'tool-material-closeout-operation',
    name: 'Tool & Material Closeout',
    description: 'Handle tools and materials after project completion',
    steps: [
      {
        id: 'return-tools-step',
        step: 'Return Tools',
        description: 'Clean and return any rented tools to avoid late fees',
        contentType: 'text' as const,
        content: 'Clean all rented tools thoroughly and return them to the rental facility. Check rental agreements for return deadlines to avoid additional charges.',
        materials: [],
        tools: [],
        outputs: [{
          id: 'return-tools-output',
          name: 'Rented Tools Returned',
          description: 'All rented tools cleaned and returned on time',
          type: 'none' as const
        }]
      },
      {
        id: 'store-tools-step',
        step: 'Store Tools',
        description: 'Organize and store newly purchased tools',
        contentType: 'text' as const,
        content: 'Clean and properly store all purchased tools in your tool storage area. Keep receipts and warranty information in a safe place.',
        materials: [],
        tools: [],
        outputs: [{
          id: 'store-tools-output',
          name: 'Tools Organized',
          description: 'Purchased tools cleaned and properly stored',
          type: 'none' as const
        }]
      },
      {
        id: 'store-materials-step',
        step: 'Store Materials',
        description: 'Organize and store leftover materials for future use',
        contentType: 'text' as const,
        content: 'Properly organize and store any remaining materials in a dry, safe location. Label containers and keep receipts for warranty purposes.',
        materials: [],
        tools: [],
        outputs: [{
          id: 'store-materials-output',
          name: 'Materials Stored',
          description: 'Leftover materials properly organized and stored',
          type: 'none' as const
        }]
      },
      {
        id: 'dispose-materials-step',
        step: 'Dispose Materials',
        description: 'Responsibly dispose of construction waste and debris',
        contentType: 'text' as const,
        content: 'Dispose of construction waste according to local regulations. Separate recyclable materials and hazardous waste for proper disposal.',
        materials: [],
        tools: [],
        outputs: [{
          id: 'dispose-materials-output',
          name: 'Waste Disposed',
          description: 'Construction waste responsibly disposed of',
          type: 'none' as const
        }]
      }
    ]
  };

  const celebrateOperation: Operation = {
    id: 'celebration-operation',
    name: 'Celebration',
    description: 'Celebrate your successful project completion',
    steps: [
      {
        id: 'celebrate-step',
        step: 'Celebrate Your Success',
        description: 'Take time to appreciate your accomplishment and share your success',
        contentType: 'text' as const,
        content: 'Congratulations on completing your project! Take photos of your finished work, share with family and friends, and enjoy the satisfaction of a job well done.',
        materials: [],
        tools: [],
        outputs: [{
          id: 'celebration-output',
          name: 'Project Celebrated',
          description: 'Achievement recognized and celebrated',
          type: 'none' as const
        }]
      }
    ]
  };

  const closeProjectPhase: Phase = {
    id: 'close-project-phase',
    name: 'Close Project',
    description: 'Final cleanup, organization, and celebration of project completion',
    operations: [toolMaterialProcessingOperation, celebrateOperation],
    isStandard: true
  };

  return closeProjectPhase;
};

// Function to ensure standard phases for new project creation only - with deduplication
// This preserves existing phases (including apps) and only adds missing standard phases
// Uses isStandard flag and phaseOrderNumber instead of hardcoded names
export const ensureStandardPhasesForNewProject = (phases: Phase[]): Phase[] => {
  const missingPhases: Phase[] = [];

  // Mark existing standard phases with isStandard flag (if not already marked)
  const markedPhases = phases.map(phase => {
    // If phase is already marked as standard, keep it
    if (phase.isStandard === true) {
      return phase;
    }
    // For backward compatibility: if phase has standard order numbers, mark as standard
    if (phase.phaseOrderNumber === 'first' || 
        phase.phaseOrderNumber === 'last' ||
        (typeof phase.phaseOrderNumber === 'number' && phase.phaseOrderNumber >= 1 && phase.phaseOrderNumber <= 4)) {
      return { ...phase, isStandard: true };
    }
    return phase;
  });

  // Check for missing standard phases by phaseOrderNumber
  const hasFirstPhase = markedPhases.some(p => p.isStandard === true && p.phaseOrderNumber === 'first');
  const hasLastPhase = markedPhases.some(p => p.isStandard === true && p.phaseOrderNumber === 'last');
  const hasPhase2 = markedPhases.some(p => p.isStandard === true && p.phaseOrderNumber === 2);
  const hasPhase3 = markedPhases.some(p => p.isStandard === true && 
    (p.phaseOrderNumber === 3 || 
     (typeof p.phaseOrderNumber === 'number' && p.phaseOrderNumber > 2 && p.phaseOrderNumber < 10))); // Ordering is typically 3rd

  // CRITICAL: Only create fresh phases if they don't exist
  // This ensures apps and other data from template phases are preserved
  // Note: We create phases with specific names for backward compatibility, but check by isStandard flag
  if (!hasFirstPhase) {
    missingPhases.push(createKickoffPhase());
  }
  if (!hasPhase2) {
    missingPhases.push(createPlanningPhase());
  }
  if (!hasPhase3) {
    missingPhases.push(createOrderingPhase());
  }
  if (!hasLastPhase) {
    missingPhases.push(createCloseProjectPhase());
  }

  // Combine existing and missing phases
  // Existing phases (from template) retain all their data including apps
  const allPhases = [...markedPhases, ...missingPhases];
  
  // Enforce standard phase ordering using the utility function
  return enforceStandardPhaseOrdering(allPhases);
};

// NEW: Function to check if project has all standard phases
// Uses isStandard flag and phaseOrderNumber instead of hardcoded names
export const hasAllStandardPhases = (phases: Phase[]): boolean => {
  const standardPhases = phases.filter(p => p.isStandard === true && !p.isLinked);
  const hasFirst = standardPhases.some(p => p.phaseOrderNumber === 'first');
  const hasLast = standardPhases.some(p => p.phaseOrderNumber === 'last');
  const hasNumbered = standardPhases.some(p => typeof p.phaseOrderNumber === 'number' && p.phaseOrderNumber >= 2);
  
  // At minimum, should have 'first' and 'last' phases, plus at least one numbered phase in between
  return hasFirst && hasLast && hasNumbered && standardPhases.length >= 3;
};

/**
 * @deprecated This function is no longer used. 
 * - For new projects: Use ensureStandardPhasesForNewProject
 * - For project runs: Standard phases are already included from the database
 * - For display: Use phases directly from project/projectRun
 * 
 * This function will be removed in a future version.
 */
export const addStandardPhasesToProjectRun = (phases: Phase[]): Phase[] => {
  console.warn('addStandardPhasesToProjectRun is deprecated and should not be used. Standard phases are now stored in the database.');
  
  let processedPhases = [...phases];
  
  // Check if kickoff phase already exists
  const hasKickoff = processedPhases.some(phase => phase.name === 'Kickoff');
  if (!hasKickoff) {
    processedPhases = [createKickoffPhase(), ...processedPhases];
  }
  
  // Check if planning phase already exists
  const hasPlanning = processedPhases.some(phase => phase.name === 'Planning');
  if (!hasPlanning) {
    // Insert planning phase after kickoff
    const kickoffIndex = processedPhases.findIndex(phase => phase.name === 'Kickoff');
    if (kickoffIndex >= 0) {
      processedPhases.splice(kickoffIndex + 1, 0, createPlanningPhase());
    } else {
      processedPhases.unshift(createPlanningPhase());
    }
  }
  
  // Check if ordering phase already exists
  const hasOrdering = processedPhases.some(phase => phase.name === 'Ordering');
  if (!hasOrdering) {
    // Insert ordering phase after planning
    const planningIndex = processedPhases.findIndex(phase => phase.name === 'Planning');
    if (planningIndex >= 0) {
      processedPhases.splice(planningIndex + 1, 0, createOrderingPhase());
    } else {
      // If no planning phase, add after kickoff
      const kickoffIndex = processedPhases.findIndex(phase => phase.name === 'Kickoff');
      if (kickoffIndex >= 0) {
        processedPhases.splice(kickoffIndex + 1, 0, createOrderingPhase());
      } else {
        processedPhases.unshift(createOrderingPhase());
      }
    }
  }

  // Check if close project phase already exists
  const hasCloseProject = processedPhases.some(phase => phase.name === 'Close Project');
  if (!hasCloseProject) {
    // Always add close project phase at the end
    processedPhases.push(createCloseProjectPhase());
  }

  return processedPhases;
};

/**
 * @deprecated This is an alias for addStandardPhasesToProjectRun which is also deprecated.
 * This function will be removed in a future version.
 */
export const addKickoffPhaseToProjectRun = addStandardPhasesToProjectRun;

export const isKickoffPhaseComplete = (completedSteps: string[]): boolean => {
  const kickoffStepIds = [
    'kickoff-step-1',
    'kickoff-step-2',
    'kickoff-step-3'
  ];
  
  // STRICT CHECK: All 3 UI kickoff step IDs must be present
  const allKickoffStepsComplete = kickoffStepIds.every(stepId => 
    completedSteps.includes(stepId)
  );
  
  console.log('🎯 isKickoffPhaseComplete check:', {
    completedSteps,
    kickoffStepIds,
    stepCompletion: kickoffStepIds.map(id => ({
      id,
      completed: completedSteps.includes(id)
    })),
    result: allKickoffStepsComplete
  });
  
  return allKickoffStepsComplete;
};

export const getKickoffStepIndex = (stepId: string): number => {
  const kickoffStepIds = [
    'kickoff-step-1',
    'kickoff-step-2',
    'kickoff-step-3',
    'kickoff-step-4'
  ];
  
  return kickoffStepIds.indexOf(stepId);
};