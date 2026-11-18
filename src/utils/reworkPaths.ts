/**
 * Pre-built rework paths. A rework path is a template operation with flowType 'rework', linked to
 * the failure modes and outputs it recovers. It is not in the plan until a failure triggers it;
 * then it lands right after the failing step's operation, with its own steps, controls, and
 * durations. Loop-back steps re-run an earlier step by reference (repeatsStepId).
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { Operation, Phase, WorkflowStep } from '@/interfaces/Project';
import { reopenStepCompletion } from '@/utils/reworkEngine';

export class ReworkPathError extends Error {}

export interface ReworkPathFailureMode {
  id: string;
  failureMode: string;
}

export interface ReworkPath {
  operationId: string;
  operationName: string;
  operationDescription: string | null;
  failureModes: ReworkPathFailureMode[];
  outputIds: string[];
}

function asRecord(value: Json | undefined, label: string): Record<string, Json | undefined> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ReworkPathError(`${label} has an unexpected shape`);
  }
  return value as Record<string, Json | undefined>;
}

function asArray(value: Json | undefined, label: string): Json[] {
  if (!Array.isArray(value)) throw new ReworkPathError(`${label} is not a list`);
  return value;
}

/** Rework paths recover template steps, so loop-back steps look up the step they repeat. */
export function reworkTriggerStepId(step: Pick<WorkflowStep, 'id' | 'repeatsStepId'>): string {
  return step.repeatsStepId ? step.repeatsStepId : step.id;
}

export async function fetchReworkPathsForStep(stepId: string): Promise<ReworkPath[]> {
  const { data, error } = await supabase.rpc('get_rework_paths_for_step', { p_step_id: stepId });
  if (error) throw new ReworkPathError(`Could not load rework paths: ${error.message}`);
  // The SQL aggregate is null when the step has no rework path.
  if (data === null) return [];
  return asArray(data, 'Rework paths').map((item) => {
    const path = asRecord(item, 'Rework path');
    if (typeof path.operationId !== 'string' || typeof path.operationName !== 'string') {
      throw new ReworkPathError('Rework path is missing its operation');
    }
    const rawDescription = path.operationDescription;
    let operationDescription: string | null;
    if (rawDescription === null) {
      operationDescription = null;
    } else if (typeof rawDescription === 'string') {
      operationDescription = rawDescription;
    } else {
      throw new ReworkPathError('Rework path description has an unexpected type');
    }
    return {
      operationId: path.operationId,
      operationName: path.operationName,
      operationDescription,
      failureModes: asArray(path.failureModes, 'Rework path failure modes').map((fmItem) => {
        const fm = asRecord(fmItem, 'Rework path failure mode');
        if (typeof fm.id !== 'string' || typeof fm.failureMode !== 'string') {
          throw new ReworkPathError('Rework path failure mode is incomplete');
        }
        return { id: fm.id, failureMode: fm.failureMode };
      }),
      outputIds: asArray(path.outputIds, 'Rework path outputs').map((outputId) => {
        if (typeof outputId !== 'string') throw new ReworkPathError('Rework path output id is not text');
        return outputId;
      }),
    };
  });
}

async function fetchReworkOperation(operationId: string): Promise<Operation> {
  const { data, error } = await supabase.rpc('get_rework_operation_json', {
    p_operation_id: operationId,
  });
  if (error) throw new ReworkPathError(`Could not load the rework path: ${error.message}`);
  const record = asRecord(data, 'Rework operation');
  const operation = asRecord(record.operation, 'Rework operation body');
  if (operation.flowType !== 'rework') {
    throw new ReworkPathError(`Operation ${operationId} is not a rework path`);
  }
  if (!Array.isArray(operation.steps) || operation.steps.length === 0) {
    throw new ReworkPathError(`Rework path ${operationId} has no steps`);
  }
  return operation as unknown as Operation;
}

export interface PlacedReworkPath {
  phases: Phase[];
  completedSteps: string[];
  /** True when the path was already in the plan and its steps were reopened instead. */
  reopened: boolean;
}

/**
 * Put a rework path into the run. A path that already ran is reopened (its steps go back to
 * incomplete) rather than duplicated, so a second failure repeats the same planned work.
 */
export async function placeReworkPathInRun(input: {
  projectRunId: string;
  runPhases: Phase[];
  completedSteps: string[];
  operationId: string;
  triggerStepId: string;
  failureModeIds: string[];
}): Promise<PlacedReworkPath> {
  const { projectRunId, runPhases, completedSteps, operationId, triggerStepId, failureModeIds } = input;
  const activation = {
    activatedAt: new Date().toISOString(),
    triggerStepId,
    failureModeIds,
  };
  const next: Phase[] = JSON.parse(JSON.stringify(runPhases));

  for (const phase of next) {
    const existing = (phase.operations || []).find((op) => op.id === operationId);
    if (existing) {
      existing.reworkActivation = activation;
      let reopened = [...completedSteps];
      for (const step of existing.steps || []) {
        reopened = reopenStepCompletion(reopened, step.id, null);
      }
      return { phases: next, completedSteps: reopened, reopened: true };
    }
  }

  const operation = await fetchReworkOperation(operationId);

  const { error: snapshotError } = await supabase.rpc('snapshot_operation_instructions_to_run', {
    p_run_id: projectRunId,
    p_operation_id: operationId,
  });
  if (snapshotError) {
    throw new ReworkPathError(`Could not copy rework instructions: ${snapshotError.message}`);
  }

  for (const phase of next) {
    const ops = phase.operations || [];
    const failingOpIndex = ops.findIndex((op) =>
      (op.steps || []).some((step) => step.id === triggerStepId || step.repeatsStepId === triggerStepId)
    );
    if (failingOpIndex >= 0) {
      ops.splice(failingOpIndex + 1, 0, { ...operation, reworkActivation: activation });
      phase.operations = ops;
      return { phases: next, completedSteps, reopened: false };
    }
  }

  throw new ReworkPathError(`The failing step ${triggerStepId} is not in this run's plan`);
}
