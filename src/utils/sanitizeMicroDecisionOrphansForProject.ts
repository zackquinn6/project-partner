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

function validSectionIdsFromContentSections(sections: ContentSection[]): Set<string> {
  const ids = new Set<string>();
  for (const s of sections) {
    if (typeof s.id === 'string' && s.id.length > 0) ids.add(s.id);
  }
  return ids;
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
 * `decisionApplicability` from `operation_steps.content_sections` and `step_instructions.content`,
 * and drop `linkedContentSectionIds` that reference removed instruction section ids.
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
    .select('id, content_sections, tools, materials')
    .in('operation_id', opIds);

  if (stepsError) {
    console.warn('sanitizeMicroDecisionOrphansForProject: operation_steps', stepsError);
    return { operationStepsUpdated: 0, instructionsUpdated: 0 };
  }

  const stepIds: string[] = [];

  for (const row of steps || []) {
    const id = row.id as string;
    if (!id) continue;
    stepIds.push(id);

    const rawSections = parseJsonArray((row as { content_sections?: unknown }).content_sections);
    const asContentSections = rawSections as ContentSection[];
    const sanitizedSections = sanitizeContentSectionsDecisionApplicability(asContentSections, decisions);
    const validIds = validSectionIdsFromContentSections(sanitizedSections);

    const toolsRes = sanitizeToolsMaterialsLinks((row as { tools?: Json | null }).tools ?? null, validIds);
    const matsRes = sanitizeToolsMaterialsLinks((row as { materials?: Json | null }).materials ?? null, validIds);

    const sectionsChanged = JSON.stringify(rawSections) !== JSON.stringify(sanitizedSections);

    if (sectionsChanged || toolsRes.changed || matsRes.changed) {
      const { error: upErr } = await supabase
        .from('operation_steps')
        .update({
          content_sections: sanitizedSections as unknown as Json,
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

  if (stepIds.length === 0) {
    return { operationStepsUpdated, instructionsUpdated };
  }

  const { data: instrRows, error: instrErr } = await supabase
    .from('step_instructions')
    .select('id, content')
    .in('step_id', stepIds);

  if (instrErr) {
    console.warn('sanitizeMicroDecisionOrphansForProject: step_instructions', instrErr);
    return { operationStepsUpdated, instructionsUpdated };
  }

  for (const ir of instrRows || []) {
    const iid = ir.id as string;
    const { next, changed } = sanitizeInstructionRecordContent(ir.content, decisions);
    if (!changed) continue;
    const { error: upErr } = await supabase
      .from('step_instructions')
      .update({
        content: next as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', iid);

    if (!upErr) {
      instructionsUpdated += 1;
    } else {
      console.warn('sanitizeMicroDecisionOrphansForProject: update step_instructions', iid, upErr);
    }
  }

  return { operationStepsUpdated, instructionsUpdated };
}
