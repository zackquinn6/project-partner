import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';

export const createKickoffPhase = (): Phase => {
  const kickoffSteps: WorkflowStep[] = [
    {
      id: 'kickoff-step-1',
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
      id: 'kickoff-step-2',
      step: 'Project Partner Agreement',
      description: 'Review and sign the project partner agreement',
      contentType: 'text' as const,
      content: 'Please review the project partner agreement terms and provide your digital signature to proceed.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'agreement-output',
        name: 'Signed Agreement',
        description: 'Project partner agreement signed and documented',
        type: 'none' as const
      }]
    },
    {
      id: 'kickoff-step-3',
      step: 'Project Planning',
      description: 'Customize your project workflow by adding phases from our library',
      contentType: 'text' as const,
      content: 'Customize your project by adding additional phases from our library or create custom phases for your specific needs.',
      materials: [],
      tools: [],
      outputs: [{
        id: 'planning-output',
        name: 'Project Workflow Customized',
        description: 'Project phases selected and workflow finalized',
        type: 'none' as const
      }]
    }
  ];

  const kickoffOperation: Operation = {
    id: 'kickoff-operation',
    name: 'Kickoff',
    description: 'Essential project setup and customization',
    steps: kickoffSteps
  };

  const kickoffPhase: Phase = {
    id: 'kickoff-phase',
    name: 'Kickoff',
    description: 'Essential project setup, agreement, and customization',
    operations: [kickoffOperation]
  };

  return kickoffPhase;
};

export const addKickoffPhaseToProjectRun = (phases: Phase[]): Phase[] => {
  // Check if kickoff phase already exists
  const hasKickoff = phases.some(phase => phase.name === 'Kickoff');
  
  if (hasKickoff) {
    return phases;
  }

  // Add kickoff phase as the first phase
  return [createKickoffPhase(), ...phases];
};

export const isKickoffPhaseComplete = (completedSteps: string[]): boolean => {
  const kickoffStepIds = [
    'kickoff-step-1',
    'kickoff-step-2', 
    'kickoff-step-3'
  ];
  
  return kickoffStepIds.every(stepId => completedSteps.includes(stepId));
};

export const getKickoffStepIndex = (stepId: string): number => {
  const kickoffStepIds = [
    'kickoff-step-1',
    'kickoff-step-2',
    'kickoff-step-3'
  ];
  
  return kickoffStepIds.indexOf(stepId);
};