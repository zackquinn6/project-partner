/**
 * Keeps pfmea_requirements in step with operation_steps.outputs.
 *
 * Requirements used to be rebuilt in memory on every load, so a failure mode's link to its
 * requirement was a string that fell back to array position. They are rows now, which means
 * they have to be reconciled when the Process Map adds, renames, or removes an output.
 *
 * Reconciliation is by output id, never by position or name. An output without an id gets one
 * written back to the step first, so the link is stable from that point on.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { Output } from '@/interfaces/Project';

export interface RequirementSyncResult {
  inserted: number;
  renamed: number;
  reordered: number;
  /**
   * Requirements whose output is gone from the step. Not deleted here: dropping one cascades
   * to its failure modes and deletes authored analysis, so removal stays an explicit action
   * in the PFMEA grid.
   */
  orphanedRequirementIds: string[];
}

/** Outputs the PFMEA grid can author against: an object with a non-empty name. */
export function parseAuthorableOutputs(raw: unknown): Output[] {
  if (!Array.isArray(raw)) return [];
  const valid: Output[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const output = item as Partial<Output>;
    if (typeof output.name !== 'string') continue;
    const trimmedName = output.name.trim();
    if (!trimmedName) continue;
    valid.push({ ...output, name: trimmedName } as Output);
  }
  return valid;
}

export function newOutputId(): string {
  return crypto.randomUUID();
}

interface StepOutputsRow {
  id: string;
  outputs: unknown;
}

/**
 * Give every authorable output on these steps a stable id, writing back only the steps that
 * actually changed. Returns the outputs as they now stand in the database.
 */
async function ensureStableOutputIds(
  steps: StepOutputsRow[]
): Promise<Map<string, Output[]>> {
  const byStep = new Map<string, Output[]>();

  for (const step of steps) {
    const outputs = parseAuthorableOutputs(step.outputs);
    const needsId = outputs.some((o) => typeof o.id !== 'string' || o.id.trim() === '');

    if (!needsId) {
      byStep.set(step.id, outputs);
      continue;
    }

    // Rewrite the whole array so ids land on the stored objects, preserving order and any
    // element the grid does not author.
    const raw = Array.isArray(step.outputs) ? [...(step.outputs as unknown[])] : [];
    const rewritten = raw.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const output = item as Partial<Output>;
      if (typeof output.name !== 'string' || output.name.trim() === '') return item;
      if (typeof output.id === 'string' && output.id.trim() !== '') return item;
      return { ...output, id: newOutputId() };
    });

    const { error } = await supabase
      .from('operation_steps')
      .update({ outputs: rewritten as unknown as Json })
      .eq('id', step.id);
    if (error) throw error;

    byStep.set(step.id, parseAuthorableOutputs(rewritten));
  }

  return byStep;
}

/**
 * Reconcile requirements for one template project. Safe to call repeatedly.
 */
export async function syncPfmeaRequirementsForProject(
  projectId: string
): Promise<RequirementSyncResult> {
  const { data: phaseRows, error: phaseError } = await supabase
    .from('project_phases')
    .select('id, phase_operations(id, operation_steps(id, outputs))')
    .eq('project_id', projectId);
  if (phaseError) throw phaseError;

  const steps: StepOutputsRow[] = [];
  for (const phase of phaseRows ?? []) {
    for (const operation of phase.phase_operations ?? []) {
      for (const step of operation.operation_steps ?? []) {
        steps.push({ id: step.id, outputs: step.outputs });
      }
    }
  }

  const outputsByStep = await ensureStableOutputIds(steps);

  const { data: existing, error: existingError } = await supabase
    .from('pfmea_requirements')
    .select('id, operation_step_id, output_id, requirement_text, display_order')
    .eq('project_id', projectId);
  if (existingError) throw existingError;

  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const row of existing ?? []) {
    if (row.output_id == null) continue;
    existingByKey.set(`${row.operation_step_id}::${row.output_id}`, row);
  }

  const toInsert: {
    project_id: string;
    operation_step_id: string;
    output_id: string;
    requirement_text: string;
    display_order: number;
  }[] = [];
  const toUpdate: { id: string; requirement_text?: string; display_order?: number }[] = [];
  const seenKeys = new Set<string>();

  for (const [stepId, outputs] of outputsByStep) {
    outputs.forEach((output, index) => {
      const outputId = output.id as string;
      const key = `${stepId}::${outputId}`;
      seenKeys.add(key);
      const row = existingByKey.get(key);

      if (!row) {
        toInsert.push({
          project_id: projectId,
          operation_step_id: stepId,
          output_id: outputId,
          requirement_text: output.name,
          display_order: index,
        });
        return;
      }

      const patch: { id: string; requirement_text?: string; display_order?: number } = { id: row.id };
      if (row.requirement_text !== output.name) patch.requirement_text = output.name;
      if (row.display_order !== index) patch.display_order = index;
      if (patch.requirement_text !== undefined || patch.display_order !== undefined) {
        toUpdate.push(patch);
      }
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('pfmea_requirements').insert(toInsert);
    if (error) throw error;
  }

  let renamed = 0;
  let reordered = 0;
  for (const patch of toUpdate) {
    const { id, ...fields } = patch;
    const { error } = await supabase.from('pfmea_requirements').update(fields).eq('id', id);
    if (error) throw error;
    if (fields.requirement_text !== undefined) renamed += 1;
    if (fields.display_order !== undefined) reordered += 1;
  }

  const orphanedRequirementIds = (existing ?? [])
    .filter((row) => row.output_id != null && !seenKeys.has(`${row.operation_step_id}::${row.output_id}`))
    .map((row) => row.id);

  return {
    inserted: toInsert.length,
    renamed,
    reordered,
    orphanedRequirementIds,
  };
}
