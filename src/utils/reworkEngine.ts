import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { ProjectRun } from '@/interfaces/ProjectRun';
import { TemplateFamily } from '@/utils/templateFamilies';

export type TriageType =
  | 'unclear_instructions'
  | 'missing_tools'
  | 'tool_malfunction'
  | 'missing_materials'
  | 'defective_materials'
  | 'unplanned_work'
  | 'mistake'
  | 'qc_fail'
  | 'injury_near_miss'
  | 'partner_delay'
  | 'weather_delay';

export type ReworkSeverity = 'minor' | 'critical' | 'delay' | 'stop';

export type RecoveryAction =
  | 'reopen_step'
  | 'insert_rework_op'
  | 'open_shopping'
  | 'open_unplanned_work'
  | 'open_tool_rentals'
  | 'schedule_slip'
  | 'stop_and_seek_help'
  | 'ask_ai';

export interface RecoveryPlan {
  summary: string;
  severity: ReworkSeverity;
  actions: RecoveryAction[];
  userSteps: string[];
}

export const TRIAGE_OPTIONS: Array<{
  type: TriageType;
  label: string;
  description: string;
}> = [
  {
    type: 'unclear_instructions',
    label: 'Instructions unclear',
    description: 'Missing steps, measurements, or sequence confusion',
  },
  {
    type: 'missing_tools',
    label: 'Missing tools',
    description: 'Tool not on hand or not delivered',
  },
  {
    type: 'tool_malfunction',
    label: 'Tool problem',
    description: 'Breaks or will not operate correctly',
  },
  {
    type: 'missing_materials',
    label: 'Missing / wrong materials',
    description: 'Absent, wrong type, or wrong quantity',
  },
  {
    type: 'defective_materials',
    label: 'Defective materials',
    description: 'Damaged, expired, or unsafe to use',
  },
  {
    type: 'unplanned_work',
    label: 'Unplanned work discovered',
    description: 'Hidden damage or new tasks needed',
  },
  {
    type: 'mistake',
    label: 'Mistake / damaged work',
    description: 'Something needs to be fixed or redone',
  },
  {
    type: 'qc_fail',
    label: 'Quality check failed',
    description: 'Checkpoint or photo did not pass',
  },
  {
    type: 'injury_near_miss',
    label: 'Injury or near-miss',
    description: 'Stop — safety first',
  },
  {
    type: 'partner_delay',
    label: 'Partner / delivery delay',
    description: 'Help or materials arrived late',
  },
  {
    type: 'weather_delay',
    label: 'Weather delay',
    description: 'Environment blocked progress',
  },
];

export function buildRecoveryPlan(triageType: TriageType): RecoveryPlan {
  switch (triageType) {
    case 'injury_near_miss':
      return {
        summary: 'Stop work. Get medical help if needed. Do not continue this step until it is safe.',
        severity: 'stop',
        actions: ['stop_and_seek_help'],
        userSteps: [
          'Stop the task immediately',
          'Address any injury — seek professional care if needed',
          'Do not resume until the hazard is controlled',
        ],
      };
    case 'unclear_instructions':
      return {
        summary: 'We will keep you on this step and open AI help scoped to this project family.',
        severity: 'minor',
        actions: ['reopen_step', 'ask_ai'],
        userSteps: [
          'Stay on this step',
          'Ask AI for clarification on this project family',
          'Continue once the sequence is clear',
        ],
      };
    case 'missing_tools':
      return {
        summary: 'Mark this step incomplete and open tool access / rentals so you can get what you need.',
        severity: 'minor',
        actions: ['reopen_step', 'open_tool_rentals', 'schedule_slip'],
        userSteps: [
          'Reopen this step until the tool is available',
          'Check owned tools or rentals',
          'Expect your schedule to slip until the tool is ready',
        ],
      };
    case 'tool_malfunction':
      return {
        summary: 'Pause this step, find an alternate or rental, then resume.',
        severity: 'critical',
        actions: ['reopen_step', 'open_tool_rentals', 'schedule_slip'],
        userSteps: [
          'Stop using the failed tool',
          'Find an alternate or rental',
          'Resume the step when you have a working tool',
        ],
      };
    case 'missing_materials':
      return {
        summary: 'Reopen ordering, add a top-up, and hold the step until materials arrive.',
        severity: 'minor',
        actions: ['reopen_step', 'open_shopping', 'schedule_slip'],
        userSteps: [
          'Add the missing items to your shopping list',
          'Reopen Tool & Material Ordering if it was complete',
          'Resume this step after materials are on hand',
        ],
      };
    case 'defective_materials':
      return {
        summary: 'Do not use defective materials. Replace them and redo affected work.',
        severity: 'critical',
        actions: ['insert_rework_op', 'open_shopping', 'reopen_step', 'schedule_slip'],
        userSteps: [
          'Set aside defective materials',
          'Order replacements',
          'Follow the inserted Rework operation before moving on',
        ],
      };
    case 'unplanned_work':
      return {
        summary: 'Open Course Correct to add the discovered work, then refresh shopping and schedule.',
        severity: 'critical',
        actions: ['open_unplanned_work', 'open_shopping', 'schedule_slip', 'reopen_step'],
        userSteps: [
          'Capture the discovery in Unplanned Work / Course Correct',
          'Update shopping if new materials are needed',
          'Accept the new finish date',
        ],
      };
    case 'mistake':
    case 'qc_fail':
      return {
        summary: 'Insert a Rework operation with fix steps, then re-check this step before continuing.',
        severity: 'critical',
        actions: ['insert_rework_op', 'reopen_step', 'schedule_slip'],
        userSteps: [
          'Complete the Rework operation (remove / redo / re-check)',
          'Re-photo or re-check quality outputs on this step',
          'Mark the original step complete only after checks pass',
        ],
      };
    case 'partner_delay':
    case 'weather_delay':
      return {
        summary: 'Keep the step open and slip the schedule until you can work again.',
        severity: 'delay',
        actions: ['reopen_step', 'schedule_slip'],
        userSteps: [
          'Leave this step incomplete',
          'Resume when conditions or help allow',
          'Review the updated finish date',
        ],
      };
    default: {
      const _exhaustive: never = triageType;
      void _exhaustive;
      return {
        summary: 'We logged the issue and will keep this step open.',
        severity: 'minor',
        actions: ['reopen_step', 'ask_ai'],
        userSteps: ['Stay on this step', 'Ask for help if you remain stuck'],
      };
    }
  }
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Critical fails insert a visible Rework operation before the current operation. */
export function insertReworkOperation(
  phases: Phase[],
  phaseId: string | undefined,
  stepId: string | undefined,
  triageType: TriageType,
  comments: string
): { phases: Phase[]; reworkOperationId: string | null; reworkStepId: string | null } {
  if (!phaseId || !stepId) {
    return { phases, reworkOperationId: null, reworkStepId: null };
  }

  const plan = buildRecoveryPlan(triageType);
  const cloned: Phase[] = JSON.parse(JSON.stringify(phases));
  const phase = cloned.find((p) => p.id === phaseId);
  if (!phase?.operations?.length) {
    return { phases, reworkOperationId: null, reworkStepId: null };
  }

  let opIndex = phase.operations.findIndex((op) =>
    (op.steps || []).some((s) => s.id === stepId)
  );
  if (opIndex < 0) opIndex = 0;

  const reworkOperationId = newId('rework-op');
  const reworkStepId = newId('rework-step');
  const contentLines = [
    plan.summary,
    '',
    ...plan.userSteps.map((s, i) => `${i + 1}. ${s}`),
    comments.trim() ? `\nNotes: ${comments.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const reworkStep: WorkflowStep = {
    id: reworkStepId,
    step: 'Rework — fix before continuing',
    description: plan.summary,
    contentType: 'text',
    content: contentLines,
    materials: [],
    tools: [],
    outputs: [
      {
        id: newId('rework-out'),
        name: 'Rework verified',
        description: 'Confirm the failure is corrected before resuming the original step.',
        type: 'performance-durability',
        qualityChecks: 'Visual / functional check matches the step’s quality criteria.',
      },
    ],
  };

  const reworkOp: Operation = {
    id: reworkOperationId,
    name: 'Rework',
    description: `Recovery for: ${TRIAGE_OPTIONS.find((t) => t.type === triageType)?.label || triageType}`,
    steps: [reworkStep],
  };

  phase.operations.splice(opIndex, 0, reworkOp);
  return { phases: cloned, reworkOperationId, reworkStepId };
}

export function reopenStepCompletion(
  completedSteps: string[],
  stepId: string | undefined,
  spaceId?: string | null
): string[] {
  if (!stepId) return completedSteps;
  return completedSteps.filter((key) => {
    if (key === stepId) return false;
    if (spaceId && key === `${stepId}:${spaceId}`) return false;
    if (key.startsWith(`${stepId}:`)) return false;
    return true;
  });
}

export interface PersistReworkInput {
  userId: string;
  projectRun: ProjectRun;
  templateProjectId: string | null;
  templateFamily: TemplateFamily;
  phaseId?: string;
  phaseName?: string;
  stepId?: string;
  stepTitle?: string;
  triageType: TriageType;
  comments: string;
  recoveryPlan: RecoveryPlan;
  status: 'open' | 'applied';
}

export function legacyIssueFlagsFromTriage(triageType: TriageType): Record<string, boolean> {
  return {
    instructionsNotClear: triageType === 'unclear_instructions',
    missingTools: triageType === 'missing_tools',
    toolMalfunction: triageType === 'tool_malfunction',
    missingWrongMaterials: triageType === 'missing_materials',
    defectiveMaterials: triageType === 'defective_materials',
    unplannedWork: triageType === 'unplanned_work',
    mistakeMade: triageType === 'mistake' || triageType === 'qc_fail',
    injuryNearMiss: triageType === 'injury_near_miss',
    partnerDelay: triageType === 'partner_delay',
    weatherDelay: triageType === 'weather_delay',
  };
}
