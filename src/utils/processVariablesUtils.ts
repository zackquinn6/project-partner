import type { StepInput } from '@/interfaces/Project';

/** Persist `StepInput[]` to `operation_steps.process_variables` (shape aligned with parse). */
export function serializeProcessVariablesForDb(inputs: StepInput[]): Record<string, unknown>[] {
  return inputs.map((v) => {
    const row: Record<string, unknown> = {
      id: v.id,
      name: v.name,
      type: v.type === 'upstream' || v.type === 'input' ? 'upstream' : 'process',
    };
    if (v.description !== undefined && v.description !== '') row.description = v.description;
    if (v.required === true) row.required = true;
    if (v.options !== undefined && v.options.length > 0) row.options = v.options;
    if (v.unit !== undefined && v.unit !== '') row.unit = v.unit;
    if (v.sourceStepId !== undefined && v.sourceStepId !== '') row.sourceStepId = v.sourceStepId;
    if (v.sourceStepName !== undefined && v.sourceStepName !== '') row.sourceStepName = v.sourceStepName;
    if (v.targetValue !== undefined && v.targetValue !== '') row.targetValue = v.targetValue;
    return row;
  });
}

/** Parse `operation_steps.process_variables` JSON the same way as the workflow editor. */
export function parseProcessVariablesFromDb(raw: unknown): StepInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item, index) => {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const id = typeof item.id === 'string' && item.id ? item.id : `input-${index}`;
      const normalizedType =
        item.type === 'upstream' || item.type === 'input' ? 'upstream' : 'process';
      return {
        id,
        name,
        type: normalizedType,
        description: typeof item.description === 'string' ? item.description : undefined,
        required: typeof item.required === 'boolean' ? item.required : false,
        options: Array.isArray(item.options) ? (item.options as string[]) : undefined,
        unit: typeof item.unit === 'string' ? item.unit : undefined,
        sourceStepId: typeof item.sourceStepId === 'string' ? item.sourceStepId : undefined,
        sourceStepName: typeof item.sourceStepName === 'string' ? item.sourceStepName : undefined,
        targetValue: typeof item.targetValue === 'string' ? item.targetValue : undefined,
      };
    })
    .filter((item) => item.name.length > 0);
}

/** Row from `workflow_step_process_variables` (per-step links; optional join to `process_variables` in app layer). */
export type WorkflowStepProcessVariableRow = {
  id: string;
  step_id: string;
  variable_key: string;
  label: string | null;
  description: string | null;
  variable_type: string | null;
  unit: string | null;
  required: boolean | null;
};

export type PfmeaDisplayedProcessVariable = {
  id: string;
  title: string;
  detailLines: string[];
};

/**
 * PFMEA display: prefer relational `workflow_step_process_variables` for the step;
 * if none, use `operation_steps.process_variables` JSON (workflow editor shape).
 */
export function buildPfmeaDisplayedProcessVariables(
  workflowRows: WorkflowStepProcessVariableRow[] | undefined,
  jsonFromStep: unknown
): PfmeaDisplayedProcessVariable[] {
  if (workflowRows && workflowRows.length > 0) {
    return workflowRows.map((r) => {
      const title = (r.label && r.label.trim()) || r.variable_key;
      const detailLines = [r.description, r.unit, r.variable_type]
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter((s) => s.length > 0);
      return { id: r.id, title, detailLines };
    });
  }
  const parsed = parseProcessVariablesFromDb(jsonFromStep);
  return parsed.map((v) => ({
    id: v.id,
    title: v.name,
    detailLines: [
      v.type === 'upstream' ? 'upstream' : '',
      v.unit ?? '',
      v.targetValue ?? '',
      v.description ?? '',
    ]
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0),
  }));
}

/**
 * PFMEA process-variables column: unique display names only (one bullet per name), no descriptions.
 * Relational rows deduped by `variable_key`; JSON rows deduped by trimmed `name` (case-insensitive).
 */
export function buildUniquePfmeaProcessVariableNames(
  workflowRows: WorkflowStepProcessVariableRow[] | undefined,
  jsonFromStep: unknown
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  if (workflowRows && workflowRows.length > 0) {
    for (const r of workflowRows) {
      const display = ((r.label && r.label.trim()) || r.variable_key || '').trim();
      if (!display) continue;
      const key = (r.variable_key ?? '').trim().toLowerCase();
      const dedupe = key || display.toLowerCase();
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(display);
    }
    return out;
  }

  const parsed = parseProcessVariablesFromDb(jsonFromStep);
  for (const v of parsed) {
    const name = v.name.trim();
    if (!name) continue;
    const dedupe = name.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(name);
  }
  return out;
}
