import type { Operation, Phase } from '@/interfaces/Project';
import { DECISION_TREE_CONFIG_KEY } from '@/utils/decisionTreeSchedulingPrereqs';

/** Per-entity fields stored under `scheduling_prerequisites.__decision_tree_config__`. */
export type WorkflowDecisionDetailFields = {
  decisionDetailedSummary?: string | null;
  optionImageUrl?: string | null;
  optionDetailedDescription?: string | null;
  decisionPrompt?: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function trimOrUndefined(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** Read decision-detail fields for one entity id from scheduling_prerequisites. */
export function getWorkflowDecisionDetailsFromPrerequisites(
  schedulingPrerequisites: unknown,
  entityId: string
): WorkflowDecisionDetailFields {
  if (!isRecord(schedulingPrerequisites)) return {};
  const blob = schedulingPrerequisites[DECISION_TREE_CONFIG_KEY];
  if (!isRecord(blob)) return {};
  const entry = blob[entityId];
  if (!isRecord(entry)) return {};
  return {
    decisionPrompt: trimOrUndefined(entry.decisionPrompt) ?? null,
    decisionDetailedSummary: trimOrUndefined(entry.decisionDetailedSummary) ?? null,
    optionImageUrl: trimOrUndefined(entry.optionImageUrl) ?? null,
    optionDetailedDescription: trimOrUndefined(entry.optionDetailedDescription) ?? null,
  };
}

/**
 * Merge decision-tree detail fields onto phase operations in a phases JSON array.
 * Preserves existing op fields; only sets keys when the config has a non-empty value
 * (or when clearing is requested via explicit null in `fieldsByOpId`).
 */
export function applyWorkflowDecisionDetailsToPhases(
  phases: Phase[] | unknown,
  fieldsByOpId: Record<string, WorkflowDecisionDetailFields>
): Phase[] {
  if (!Array.isArray(phases)) return [];
  return phases.map((phase) => {
    if (!phase || typeof phase !== 'object') return phase as Phase;
    const operations = Array.isArray(phase.operations) ? phase.operations : [];
    return {
      ...phase,
      operations: operations.map((op) => {
        const fields = fieldsByOpId[op.id];
        if (!fields) return op;
        const next: Operation = { ...op };
        const prompt = trimOrUndefined(fields.decisionPrompt);
        const detailedSummary = trimOrUndefined(fields.decisionDetailedSummary);
        const imageUrl = trimOrUndefined(fields.optionImageUrl);
        const optionDetail = trimOrUndefined(fields.optionDetailedDescription);
        if (prompt !== undefined) next.userPrompt = prompt;
        if (detailedSummary !== undefined) next.decisionDetailedSummary = detailedSummary;
        if (imageUrl !== undefined) next.optionImageUrl = imageUrl;
        if (optionDetail !== undefined) next.optionDetailedDescription = optionDetail;
        return next;
      }),
    };
  });
}

/** Build opId -> detail fields map from a decision-tree config blob. */
export function workflowDecisionFieldsByOpIdFromConfigBlob(
  blob: unknown
): Record<string, WorkflowDecisionDetailFields> {
  if (!isRecord(blob)) return {};
  const out: Record<string, WorkflowDecisionDetailFields> = {};
  for (const [id, entry] of Object.entries(blob)) {
    if (!isRecord(entry)) continue;
    const prompt = trimOrUndefined(entry.decisionPrompt);
    const detailedSummary = trimOrUndefined(entry.decisionDetailedSummary);
    const imageUrl = trimOrUndefined(entry.optionImageUrl);
    const optionDetail = trimOrUndefined(entry.optionDetailedDescription);
    if (
      prompt === undefined &&
      detailedSummary === undefined &&
      imageUrl === undefined &&
      optionDetail === undefined
    ) {
      continue;
    }
    out[id] = {
      decisionPrompt: prompt ?? null,
      decisionDetailedSummary: detailedSummary ?? null,
      optionImageUrl: imageUrl ?? null,
      optionDetailedDescription: optionDetail ?? null,
    };
  }
  return out;
}

/** Collect decision-detail fields already present on phase operations (e.g. template phases cache). */
export function workflowDecisionFieldsByOpIdFromPhases(
  phases: Phase[] | undefined
): Record<string, WorkflowDecisionDetailFields> {
  const out: Record<string, WorkflowDecisionDetailFields> = {};
  if (!phases) return out;
  for (const phase of phases) {
    for (const op of phase.operations || []) {
      const prompt = trimOrUndefined(op.userPrompt);
      const detailedSummary = trimOrUndefined(op.decisionDetailedSummary);
      const imageUrl = trimOrUndefined(op.optionImageUrl);
      const optionDetail = trimOrUndefined(op.optionDetailedDescription);
      if (
        prompt === undefined &&
        detailedSummary === undefined &&
        imageUrl === undefined &&
        optionDetail === undefined
      ) {
        continue;
      }
      out[op.id] = {
        decisionPrompt: prompt ?? null,
        decisionDetailedSummary: detailedSummary ?? null,
        optionImageUrl: imageUrl ?? null,
        optionDetailedDescription: optionDetail ?? null,
      };
    }
  }
  return out;
}

/** Prefer non-empty values from `primary`, fill gaps from `fallback`. */
export function mergeWorkflowDecisionFieldsByOpId(
  primary: Record<string, WorkflowDecisionDetailFields>,
  fallback: Record<string, WorkflowDecisionDetailFields>
): Record<string, WorkflowDecisionDetailFields> {
  const out: Record<string, WorkflowDecisionDetailFields> = { ...fallback };
  for (const [id, fields] of Object.entries(primary)) {
    const prev = out[id] || {};
    out[id] = {
      decisionPrompt: trimOrUndefined(fields.decisionPrompt) ?? prev.decisionPrompt ?? null,
      decisionDetailedSummary:
        trimOrUndefined(fields.decisionDetailedSummary) ?? prev.decisionDetailedSummary ?? null,
      optionImageUrl: trimOrUndefined(fields.optionImageUrl) ?? prev.optionImageUrl ?? null,
      optionDetailedDescription:
        trimOrUndefined(fields.optionDetailedDescription) ??
        prev.optionDetailedDescription ??
        null,
    };
  }
  return out;
}

/** Extract decision-detail fields from `projects.scheduling_prerequisites`. */
export function workflowDecisionFieldsByOpIdFromPrerequisites(
  schedulingPrerequisites: unknown
): Record<string, WorkflowDecisionDetailFields> {
  if (!isRecord(schedulingPrerequisites)) return {};
  return workflowDecisionFieldsByOpIdFromConfigBlob(
    schedulingPrerequisites[DECISION_TREE_CONFIG_KEY]
  );
}

function opFlowType(op: Operation): string {
  return op.flowType || 'prime';
}

function isDecisionFlowType(flowType: string): boolean {
  return flowType === 'alternate' || flowType === 'if-necessary';
}

/** Normalize `projects.phases` / `project_runs.phases` whether array or JSON string. */
export function parsePhasesJson(raw: unknown): Phase[] {
  if (Array.isArray(raw)) return raw as Phase[];
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? (parsed as Phase[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function findMatchingTemplatePhase(
  runPhase: Phase,
  templatePhases: Phase[]
): Phase | undefined {
  const byId = templatePhases.find((p) => p.id === runPhase.id);
  if (byId) return byId;
  const runName = typeof runPhase.name === 'string' ? runPhase.name.trim().toLowerCase() : '';
  if (!runName) return undefined;
  return templatePhases.find(
    (p) => typeof p.name === 'string' && p.name.trim().toLowerCase() === runName
  );
}

/**
 * Re-attach alternate / if-necessary operations from the template onto a project-run
 * snapshot. Save-and-close historically stripped unselected decision ops from `phases`,
 * which left Customize with nothing to show on reopen. Decisions stay in
 * customization_decisions; this only restores the choice catalog for the UI.
 */
export function restoreDecisionOperationsFromTemplate(
  runPhases: Phase[] | undefined,
  templatePhases: Phase[] | undefined
): Phase[] {
  if (!Array.isArray(runPhases) || runPhases.length === 0) return runPhases || [];
  if (!Array.isArray(templatePhases) || templatePhases.length === 0) return runPhases;

  return runPhases.map((runPhase) => {
    const templatePhase = findMatchingTemplatePhase(runPhase, templatePhases);
    if (!templatePhase) return runPhase;

    const existingIds = new Set((runPhase.operations || []).map((op) => op.id));
    const missingDecisionOps = (templatePhase.operations || []).filter((op) => {
      if (existingIds.has(op.id)) return false;
      return isDecisionFlowType(opFlowType(op));
    });

    if (missingDecisionOps.length === 0) return runPhase;

    return {
      ...runPhase,
      operations: [...(runPhase.operations || []), ...missingDecisionOps],
    };
  });
}
