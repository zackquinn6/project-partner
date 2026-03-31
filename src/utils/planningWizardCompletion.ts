import type { Phase, WorkflowStep } from '@/interfaces/Project';
import type { PlanningToolId } from '@/components/KickoffSteps/ProjectToolsStep';

const STANDARD_PHASE_IDS = {
  planning: 'planning-phase',
} as const;

const PLANNING_COMPLETION_STEP_IDS = new Set([
  'final-planning-step-1',
]);

/** Native app action keys used to match workflow steps to planning wizard tools. */
const TOOL_TO_BUTTON_ACTIONS: Record<PlanningToolId, readonly string[]> = {
  scope: ['project-customizer'],
  schedule: ['project-scheduler'],
  communication_plan: ['communication-plan'],
  risk: ['risk-management', 'risk-focus'],
  budget: ['project-budgeting'],
  shopping_list: ['shopping-checklist'],
  tool_rentals: ['tool-access'],
  quality_control: ['quality-check'],
  expert_support: [],
};

/** Standard output ids that indicate a step is covered by a planning tool. */
const TOOL_TO_OUTPUT_IDS: Record<PlanningToolId, readonly string[]> = {
  scope: ['scope-output', 'customizer-output'],
  schedule: ['scheduling-output'],
  communication_plan: [],
  risk: [],
  budget: [],
  shopping_list: ['checklist-output'],
  tool_rentals: [],
  quality_control: [],
  expert_support: [],
};

function stepReferencesAction(
  step: Pick<WorkflowStep, 'content' | 'apps'>,
  action: string
): boolean {
  if (step.apps?.some((a) => a.actionKey === action)) return true;
  const content = step.content;
  if (Array.isArray(content)) {
    return content.some(
      (c) => typeof c === 'object' && c !== null && (c as { buttonAction?: string }).buttonAction === action
    );
  }
  return false;
}

function stepMatchesTool(step: WorkflowStep, tool: PlanningToolId): boolean {
  const outputHints = TOOL_TO_OUTPUT_IDS[tool];
  if (
    outputHints.length > 0 &&
    step.outputs?.some((o) => (outputHints as readonly string[]).includes(o.id))
  ) {
    return true;
  }
  const actions = TOOL_TO_BUTTON_ACTIONS[tool];
  if (actions.length === 0) return false;
  return actions.some((a) => stepReferencesAction(step, a));
}

/**
 * Finds workflow steps in the project run snapshot that correspond to tools
 * the user finished in the Project Planning Wizard, so they can be marked
 * complete with outputs checked.
 */
export function collectPlanningWizardWorkflowCompletion(
  phases: Phase[] | undefined | null,
  selectedTools: PlanningToolId[]
): { stepIds: string[]; outputEntries: { stepId: string; outputIds: string[] }[] } {
  if (!phases?.length) {
    return { stepIds: [], outputEntries: [] };
  }

  const toolSet = new Set(selectedTools);
  const matched = new Map<string, Set<string>>();
  const planningPhase = phases.find((phase) => phase?.id === STANDARD_PHASE_IDS.planning);

  if (!planningPhase) {
    return { stepIds: [], outputEntries: [] };
  }

  const visitStep = (step: WorkflowStep) => {
    if (!step?.id) return;

    if (PLANNING_COMPLETION_STEP_IDS.has(step.id)) {
      matched.set(step.id, new Set((step.outputs || []).map((output) => output.id)));
      return;
    }

    if (toolSet.size === 0) {
      return;
    }

    for (const tool of toolSet) {
      if (!stepMatchesTool(step, tool)) {
        continue;
      }

      if (!matched.has(step.id)) {
        matched.set(step.id, new Set());
      }

      const outSet = matched.get(step.id)!;
      for (const o of step.outputs || []) {
        outSet.add(o.id);
      }
      break;
    }
  };

  for (const op of planningPhase.operations || []) {
    for (const step of op.steps || []) {
      visitStep(step);
    }
  }

  const stepIds = [...matched.keys()];
  const outputEntries = stepIds.map((stepId) => ({
    stepId,
    outputIds: [...(matched.get(stepId) || [])],
  }));

  return { stepIds, outputEntries };
}
