import type {
  ContentSection,
  GeneralProjectDecision,
  Material,
  Tool,
  WorkflowStep,
} from '@/interfaces/Project';
import type { GeneralProjectChoicesMap } from '@/utils/generalProjectDecisions';

export type InstructionSectionLike = Pick<ContentSection, 'id' | 'decisionApplicability'> & {
  id?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Parse raw JSONB instruction content array into section-like objects (preserves id + decisionApplicability). */
export function parseInstructionSectionsFromContentJson(raw: unknown): InstructionSectionLike[] {
  if (!Array.isArray(raw)) return [];
  const out: InstructionSectionLike[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === 'string' && item.id.length > 0 ? item.id : undefined;
    const app = item.decisionApplicability;
    let decisionApplicability: ContentSection['decisionApplicability'] = null;
    if (Array.isArray(app)) {
      const rules: NonNullable<ContentSection['decisionApplicability']> = [];
      for (const r of app) {
        if (!isRecord(r)) continue;
        const decisionId = typeof r.decisionId === 'string' ? r.decisionId : '';
        const choiceIdsRaw = r.choiceIds;
        const choiceIds = Array.isArray(choiceIdsRaw)
          ? choiceIdsRaw.filter((x): x is string => typeof x === 'string' && x.length > 0)
          : [];
        if (decisionId.length > 0 && choiceIds.length > 0) {
          rules.push({ decisionId, choiceIds });
        }
      }
      decisionApplicability = rules.length > 0 ? rules : null;
    }
    out.push({ id, decisionApplicability });
  }
  return out;
}

/**
 * True if the user's choice for each rule's decision is in that rule's choiceIds (AND across rules).
 * If the user has no selection for a required decision, the rule fails.
 */
export function isInstructionSectionVisibleForChoices(
  section: InstructionSectionLike,
  choices: GeneralProjectChoicesMap,
  _catalog: GeneralProjectDecision[]
): boolean {
  const app = section.decisionApplicability;
  if (app === null || app === undefined || app.length === 0) {
    return true;
  }
  for (const rule of app) {
    const selected = choices[rule.decisionId];
    if (selected === undefined || selected === null || selected === '') {
      return false;
    }
    if (!rule.choiceIds.includes(selected)) {
      return false;
    }
  }
  return true;
}

export function filterSectionRowsForMicroDecisions<T extends InstructionSectionLike>(
  rows: T[],
  shouldApply: boolean,
  choices: GeneralProjectChoicesMap,
  catalog: GeneralProjectDecision[]
): T[] {
  if (!shouldApply) return rows;
  return rows.filter((row) =>
    isInstructionSectionVisibleForChoices(
      { id: row.id, decisionApplicability: row.decisionApplicability },
      choices,
      catalog
    )
  );
}

export function getVisibleInstructionSectionIds(
  sections: InstructionSectionLike[],
  choices: GeneralProjectChoicesMap,
  catalog: GeneralProjectDecision[]
): Set<string> {
  const visible = new Set<string>();
  for (const s of sections) {
    if (!isInstructionSectionVisibleForChoices(s, choices, catalog)) continue;
    if (s.id && s.id.length > 0) visible.add(s.id);
  }
  return visible;
}

/**
 * Step is visible if at least one instruction section is visible.
 * Legacy sections without `id` still participate: if visibility passes, they count.
 */
export function stepHasVisibleInstructionContent(
  sections: InstructionSectionLike[],
  choices: GeneralProjectChoicesMap,
  catalog: GeneralProjectDecision[]
): boolean {
  if (sections.length === 0) {
    return true;
  }
  for (const s of sections) {
    if (isInstructionSectionVisibleForChoices(s, choices, catalog)) {
      return true;
    }
  }
  return false;
}

export function filterToolsByVisibleSections<T extends Pick<Tool, 'linkedContentSectionIds'>>(
  tools: T[],
  visibleSectionIds: Set<string>
): T[] {
  return tools.filter((t) => {
    const links = t.linkedContentSectionIds;
    if (!links || links.length === 0) {
      return true;
    }
    return links.some((sid) => visibleSectionIds.has(sid));
  });
}

export function filterMaterialsByVisibleSections<T extends Pick<Material, 'linkedContentSectionIds'>>(
  materials: T[],
  visibleSectionIds: Set<string>
): T[] {
  return materials.filter((m) => {
    const links = m.linkedContentSectionIds;
    if (!links || links.length === 0) {
      return true;
    }
    return links.some((sid) => visibleSectionIds.has(sid));
  });
}

export function getInstructionSectionsForStep(
  step: WorkflowStep,
  instructionMap: Map<string, InstructionSectionLike[]>
): InstructionSectionLike[] {
  const fromRun = instructionMap.get(step.id);
  if (fromRun && fromRun.length > 0) {
    return fromRun;
  }
  const cs = step.contentSections;
  if (cs && Array.isArray(cs) && cs.length > 0) {
    return cs.map((s: ContentSection) => ({
      id: s.id,
      decisionApplicability: s.decisionApplicability ?? null,
    }));
  }
  return [];
}
