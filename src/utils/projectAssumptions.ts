/**
 * Assumptions: the conditions a plan depends on, and the boundary of guarantee coverage.
 *
 * Foundation assumptions apply to every run; template assumptions to one project. Both are
 * copied onto the run at create (project_run_assumptions). Each one is handled as:
 *   - checked: a step output verifies it; failure routes to a linked branch operation
 *   - branched: a linked branch operation already in the template handles it
 *   - accepted: the plan has no response; violation ends coverage
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { Phase } from '@/interfaces/Project';
import { parsePhasesJson } from '@/utils/workflowDecisionDetails';

export class ProjectAssumptionError extends Error {}

export const ASSUMPTION_HANDLINGS = ['checked', 'branched', 'accepted'] as const;
export type AssumptionHandling = (typeof ASSUMPTION_HANDLINGS)[number];

export const ASSUMPTION_HANDLING_LABELS: Record<AssumptionHandling, string> = {
  checked: 'Checked in the plan',
  branched: 'Plan has a branch',
  accepted: 'Not covered by the plan',
};

export const ASSUMPTION_CATEGORIES = [
  'structure',
  'environment',
  'utilities',
  'materials',
  'user',
  'external_events',
] as const;
export type AssumptionCategory = (typeof ASSUMPTION_CATEGORIES)[number];

export const ASSUMPTION_CATEGORY_LABELS: Record<AssumptionCategory, string> = {
  structure: 'Structure',
  environment: 'Environment',
  utilities: 'Utilities',
  materials: 'Materials',
  user: 'You and your helpers',
  external_events: 'Outside events',
};

export type AssumptionLevel = 'foundation' | 'template';

export interface RunAssumption {
  id: string;
  sourceLevel: AssumptionLevel;
  statement: string;
  category: AssumptionCategory;
  protectedGoals: string[];
  handling: AssumptionHandling;
  checkOperationStepId: string | null;
  checkOutputId: string | null;
  branchOperationId: string | null;
  displayOrder: number;
  acknowledgedAt: string | null;
  violatedAt: string | null;
  violationNote: string | null;
}

function isHandling(value: unknown): value is AssumptionHandling {
  return typeof value === 'string' && (ASSUMPTION_HANDLINGS as readonly string[]).includes(value);
}

function isCategory(value: unknown): value is AssumptionCategory {
  return typeof value === 'string' && (ASSUMPTION_CATEGORIES as readonly string[]).includes(value);
}

function isLevel(value: unknown): value is AssumptionLevel {
  return value === 'foundation' || value === 'template';
}

export async function copyAssumptionsToProjectRun(projectRunId: string): Promise<number> {
  const { data, error } = await supabase.rpc('copy_project_assumptions_to_run', {
    p_run_id: projectRunId,
  });
  if (error) throw new ProjectAssumptionError(`Could not snapshot assumptions: ${error.message}`);
  if (typeof data !== 'number') {
    throw new ProjectAssumptionError('Assumption snapshot returned no count');
  }
  return data;
}

export async function fetchRunAssumptions(projectRunId: string): Promise<RunAssumption[]> {
  const { data, error } = await supabase
    .from('project_run_assumptions')
    .select(
      'id, source_level, statement, category, protected_goals, handling, check_operation_step_id, check_output_id, branch_operation_id, display_order, acknowledged_at, violated_at, violation_note'
    )
    .eq('project_run_id', projectRunId)
    .order('source_level', { ascending: true })
    .order('display_order', { ascending: true });
  if (error) throw new ProjectAssumptionError(`Could not load assumptions: ${error.message}`);
  return (data ?? []).map((row) => {
    if (!isLevel(row.source_level)) {
      throw new ProjectAssumptionError(`Unknown assumption level ${row.source_level}`);
    }
    if (!isCategory(row.category)) {
      throw new ProjectAssumptionError(`Unknown assumption category ${row.category}`);
    }
    if (!isHandling(row.handling)) {
      throw new ProjectAssumptionError(`Unknown assumption handling ${row.handling}`);
    }
    return {
      id: row.id,
      sourceLevel: row.source_level,
      statement: row.statement,
      category: row.category,
      protectedGoals: row.protected_goals,
      handling: row.handling,
      checkOperationStepId: row.check_operation_step_id,
      checkOutputId: row.check_output_id,
      branchOperationId: row.branch_operation_id,
      displayOrder: row.display_order,
      acknowledgedAt: row.acknowledged_at,
      violatedAt: row.violated_at,
      violationNote: row.violation_note,
    };
  });
}

export function unacknowledgedAssumptions(assumptions: readonly RunAssumption[]): RunAssumption[] {
  return assumptions.filter((a) => a.acknowledgedAt === null);
}

export async function acknowledgeRunAssumptions(projectRunId: string): Promise<void> {
  const { error } = await supabase.rpc('acknowledge_project_run_assumptions', {
    p_run_id: projectRunId,
  });
  if (error) throw new ProjectAssumptionError(`Could not acknowledge assumptions: ${error.message}`);
}

export interface AssumptionViolationResult {
  handling: AssumptionHandling;
  branchOperationId: string | null;
  endsCoverage: boolean;
}

export async function markRunAssumptionViolated(
  runAssumptionId: string,
  note: string
): Promise<AssumptionViolationResult> {
  const { data, error } = await supabase.rpc('mark_project_run_assumption_violated', {
    p_run_assumption_id: runAssumptionId,
    p_note: note,
  });
  if (error) throw new ProjectAssumptionError(error.message);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new ProjectAssumptionError('Assumption violation returned an unexpected shape');
  }
  const record = data as Record<string, Json | undefined>;
  const handling = record.handling;
  if (!isHandling(handling)) {
    throw new ProjectAssumptionError('Assumption violation returned no handling');
  }
  const branch = record.branchOperationId;
  let branchOperationId: string | null;
  if (branch === null) {
    branchOperationId = null;
  } else if (typeof branch === 'string') {
    branchOperationId = branch;
  } else {
    throw new ProjectAssumptionError('Assumption violation returned an invalid branch operation');
  }
  const endsCoverage = record.endsCoverage;
  if (typeof endsCoverage !== 'boolean') {
    throw new ProjectAssumptionError('Assumption violation returned no coverage result');
  }
  return { handling, branchOperationId, endsCoverage };
}

function runHasOperation(phases: readonly Phase[], operationId: string): boolean {
  return phases.some((phase) => (phase.operations || []).some((op) => op.id === operationId));
}

/**
 * Place a template branch operation into the run's phases at its template position. Returns null
 * when the operation is already in the plan. Throws when the template does not contain it.
 */
export async function placeBranchOperationInRun(input: {
  projectRunId: string;
  templateProjectId: string;
  runPhases: Phase[];
  operationId: string;
}): Promise<Phase[] | null> {
  const { projectRunId, templateProjectId, runPhases, operationId } = input;
  if (runHasOperation(runPhases, operationId)) return null;

  const { data, error } = await supabase
    .from('projects')
    .select('phases')
    .eq('id', templateProjectId)
    .single();
  if (error) throw new ProjectAssumptionError(`Could not load the template plan: ${error.message}`);
  const templatePhases = parsePhasesJson(data.phases);

  const templatePhaseIndex = templatePhases.findIndex((phase) =>
    (phase.operations || []).some((op) => op.id === operationId)
  );
  if (templatePhaseIndex < 0) {
    throw new ProjectAssumptionError(`The template plan has no operation ${operationId}`);
  }
  const templatePhase = templatePhases[templatePhaseIndex];
  const templateOps = templatePhase.operations || [];
  const templateOpIndex = templateOps.findIndex((op) => op.id === operationId);
  const operation = templateOps[templateOpIndex];

  const { error: snapshotError } = await supabase.rpc('snapshot_operation_instructions_to_run', {
    p_run_id: projectRunId,
    p_operation_id: operationId,
  });
  if (snapshotError) {
    throw new ProjectAssumptionError(`Could not copy instructions for the branch: ${snapshotError.message}`);
  }

  const next: Phase[] = JSON.parse(JSON.stringify(runPhases));
  const runPhaseIndex = next.findIndex((phase) => phase.id === templatePhase.id);

  if (runPhaseIndex >= 0) {
    const runOps = next[runPhaseIndex].operations || [];
    const precedingTemplateIds = new Set(templateOps.slice(0, templateOpIndex).map((op) => op.id));
    let insertAt = 0;
    runOps.forEach((op, index) => {
      if (precedingTemplateIds.has(op.id)) insertAt = index + 1;
    });
    runOps.splice(insertAt, 0, operation);
    next[runPhaseIndex] = { ...next[runPhaseIndex], operations: runOps };
    return next;
  }

  const precedingPhaseIds = new Set(templatePhases.slice(0, templatePhaseIndex).map((phase) => phase.id));
  let phaseInsertAt = 0;
  next.forEach((phase, index) => {
    if (precedingPhaseIds.has(phase.id)) phaseInsertAt = index + 1;
  });
  next.splice(phaseInsertAt, 0, { ...templatePhase, operations: [operation] });
  return next;
}
