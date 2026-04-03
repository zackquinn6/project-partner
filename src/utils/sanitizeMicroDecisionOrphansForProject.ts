import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { ContentSection, GeneralProjectDecision } from '@/interfaces/Project';
import { sanitizeContentSectionsDecisionApplicability } from '@/utils/generalProjectDecisions';

function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sanitizeToolsMaterialsLinks(json: Json | null, validIds: Set<string>): { next: Json | null; changed: boolean } {
  if (json === null || json === undefined) return { next: json, changed: false };
  const arr = parseJsonArray(json);
  if (arr.length === 0) return { next: json, changed: false };
  let changed = false;
  const next = arr.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const o = item as Record<string, unknown>;
    const links = o.linkedContentSectionIds;
    if (!Array.isArray(links)) return item;
    const filtered = links.filter((id): id is string => typeof id === 'string' && validIds.has(id));
    if (filtered.length === links.length) return item;
    changed = true;
    return { ...o, linkedContentSectionIds: filtered };
  });
  return changed ? { next: next as Json, changed: true } : { next: json, changed: false };
}

function contentSectionsFromInstructionPayload(content: unknown): ContentSection[] {
  if (Array.isArray(content)) return content as ContentSection[];
  if (content !== null && typeof content === 'object' && 'sections' in content) {
    const obj = content as { sections?: unknown };
    return Array.isArray(obj.sections) ? (obj.sections as ContentSection[]) : [];
  }
  return [];
}

function sanitizeInstructionRecordContent(content: unknown, decisions: GeneralProjectDecision[]): {
  next: unknown;
  changed: boolean;
} {
  if (Array.isArray(content)) {
    const sanitized = sanitizeContentSectionsDecisionApplicability(content as ContentSection[], decisions);
    const before = JSON.stringify(content);
    const after = JSON.stringify(sanitized);
    return { next: sanitized, changed: before !== after };
  }
  if (content !== null && typeof content === 'object' && 'sections' in (content as object)) {
    const obj = content as { sections?: unknown; [k: string]: unknown };
    const secs = Array.isArray(obj.sections) ? (obj.sections as ContentSection[]) : [];
    const sanitized = sanitizeContentSectionsDecisionApplicability(secs, decisions);
    const before = JSON.stringify(obj.sections);
    const after = JSON.stringify(sanitized);
    if (before === after) return { next: content, changed: false };
    return { next: { ...obj, sections: sanitized }, changed: true };
  }
  return { next: content, changed: false };
}

/**
 * After general project decisions (or choices) are removed or changed, strip invalid
 * `decisionApplicability` from `step_instructions.content`, and drop `linkedContentSectionIds`
 * on `operation_steps.tools` / `operation_steps.materials` that reference removed section ids.
 */
export async function sanitizeMicroDecisionOrphansForProject(
  projectId: string,
  decisions: GeneralProjectDecision[]
): Promise<{ operationStepsUpdated: number; instructionsUpdated: number }> {
  let operationStepsUpdated = 0;
  let instructionsUpdated = 0;

  const { data: phases, error: phasesError } = await supabase
    .from('project_phases')
    .select('id')
    .eq('project_id', projectId);

  if (phasesError) {
    console.warn('sanitizeMicroDecisionOrphansForProject: project_phases', phasesError);
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const phaseIds = (phases || []).map((p) => p.id).filter(Boolean);
  if (phaseIds.length === 0) {
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const { data: operations, error: opsError } = await supabase
    .from('phase_operations')
    .select('id')
    .in('phase_id', phaseIds);

  if (opsError) {
    console.warn('sanitizeMicroDecisionOrphansForProject: phase_operations', opsError);
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const opIds = (operations || []).map((o) => o.id).filter(Boolean);
  if (opIds.length === 0) {
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const { data: steps, error: stepsError } = await supabase
    .from('operation_steps')
    .select('id, tools, materials')
    .in('operation_id', opIds);

  if (stepsError) {
    console.warn('sanitizeMicroDecisionOrphansForProject: operation_steps', stepsError);
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const stepList = steps || [];
  const stepIds = stepList.map((s) => s.id).filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (stepIds.length === 0) {
    return { operationStepsUpdated, instructionsUpdated };
  }

  const { data: instrRows, error: instrErr } = await supabase
    .from('step_instructions')
    .select('id, step_id, content')
    .in('step_id', stepIds);

  if (instrErr) {
    console.warn('sanitizeMicroDecisionOrphansForProject: step_instructions', instrErr);
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const instructionsByStepId = new Map<
    string,
    { id: string; step_id: string; content: Json }[]
  >();
  for (const ir of instrRows || []) {
    const sid = ir.step_id as string;
    const iid = ir.id as string;
    if (!sid || !iid) continue;
    const list = instructionsByStepId.get(sid);
    const row = { id: iid, step_id: sid, content: ir.content as Json };
    if (list) list.push(row);
    else instructionsByStepId.set(sid, [row]);
  }

  for (const row of stepList) {
    const id = row.id as string;
    if (!id) continue;

    const validIds = new Set<string>();
    const instrsForStep = instructionsByStepId.get(id) ?? [];

    for (const ir of instrsForStep) {
      const { next, changed } = sanitizeInstructionRecordContent(ir.content, decisions);
      for (const s of contentSectionsFromInstructionPayload(next)) {
        if (typeof s.id === 'string' && s.id.length > 0) validIds.add(s.id);
      }
      if (!changed) continue;
      const { error: upErr } = await supabase
        .from('step_instructions')
        .update({
          content: next as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ir.id);

      if (!upErr) {
        instructionsUpdated += 1;
      } else {
        console.warn('sanitizeMicroDecisionOrphansForProject: update step_instructions', ir.id, upErr);
      }
    }

    const toolsRes = sanitizeToolsMaterialsLinks((row as { tools?: Json | null }).tools ?? null, validIds);
    const matsRes = sanitizeToolsMaterialsLinks((row as { materials?: Json | null }).materials ?? null, validIds);

    if (toolsRes.changed || matsRes.changed) {
      const { error: upErr } = await supabase
        .from('operation_steps')
        .update({
          tools: toolsRes.next,
          materials: matsRes.next,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!upErr) {
        operationStepsUpdated += 1;
      } else {
        console.warn('sanitizeMicroDecisionOrphansForProject: update operation_steps', id, upErr);
      }
    }
  }

  return { operationStepsUpdated, instructionsUpdated };
}
