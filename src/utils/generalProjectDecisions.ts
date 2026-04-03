import type { ContentSection, GeneralProjectDecision, Phase } from '@/interfaces/Project';
import { GENERAL_PROJECT_DECISIONS_KEY } from '@/utils/decisionTreeSchedulingPrereqs';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Parse general project decisions from `projects.scheduling_prerequisites`. */
export function parseGeneralProjectDecisionsFromPrerequisites(
  schedulingPrerequisites: unknown
): GeneralProjectDecision[] {
  if (!isRecord(schedulingPrerequisites)) return [];
  const raw = schedulingPrerequisites[GENERAL_PROJECT_DECISIONS_KEY];
  if (!Array.isArray(raw)) return [];
  const out: GeneralProjectDecision[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === 'string' && item.id.length > 0 ? item.id : null;
    const label = typeof item.label === 'string' ? item.label : '';
    if (!id) continue;
    const choicesRaw = item.choices;
    const choices: GeneralProjectDecision['choices'] = [];
    if (Array.isArray(choicesRaw)) {
      for (const c of choicesRaw) {
        if (!isRecord(c)) continue;
        const cid = typeof c.id === 'string' && c.id.length > 0 ? c.id : null;
        const clabel = typeof c.label === 'string' ? c.label : '';
        if (cid) choices.push({ id: cid, label: clabel });
      }
    }
    out.push({ id, label: label || id, choices });
  }
  return out;
}

/** Collect decision ids referenced by content sections on steps in these phases. */
export function collectReferencedGeneralDecisionIdsFromPhases(phases: Phase[] | undefined): Set<string> {
  const ids = new Set<string>();
  if (!phases || !Array.isArray(phases)) return ids;

  const walkSections = (sections: unknown) => {
    if (!Array.isArray(sections)) return;
    for (const s of sections) {
      if (!isRecord(s)) continue;
      const app = s.decisionApplicability;
      if (app === null || app === undefined) continue;
      if (!Array.isArray(app)) continue;
      for (const rule of app) {
        if (!isRecord(rule)) continue;
        const did = rule.decisionId;
        if (typeof did === 'string' && did.length > 0) ids.add(did);
      }
    }
  };

  for (const phase of phases) {
    for (const op of phase.operations || []) {
      for (const step of op.steps || []) {
        walkSections((step as { contentSections?: unknown }).contentSections);
      }
    }
  }
  return ids;
}

export function filterGeneralDecisionsForPhases(
  decisions: GeneralProjectDecision[],
  phases: Phase[] | undefined
): GeneralProjectDecision[] {
  const ref = collectReferencedGeneralDecisionIdsFromPhases(phases);
  if (ref.size === 0) return [];
  return decisions.filter((d) => ref.has(d.id));
}

/** Strip applicability rules whose decision id no longer exists; drop invalid choice ids. */
export function sanitizeContentSectionsDecisionApplicability(
  sections: ContentSection[],
  decisions: GeneralProjectDecision[]
): ContentSection[] {
  const decisionMap = new Map(decisions.map((d) => [d.id, new Set(d.choices.map((c) => c.id))]));
  return sections.map((section) => {
    const app = section.decisionApplicability;
    if (app === null || app === undefined) return section;
    if (!Array.isArray(app) || app.length === 0) {
      return { ...section, decisionApplicability: null };
    }
    const nextRules = app
      .map((rule) => {
        const validChoices = decisionMap.get(rule.decisionId);
        if (!validChoices) return null;
        const choiceIds = rule.choiceIds.filter((cid) => validChoices.has(cid));
        if (choiceIds.length === 0) return null;
        return { decisionId: rule.decisionId, choiceIds };
      })
      .filter((r): r is { decisionId: string; choiceIds: string[] } => r !== null);
    return {
      ...section,
      decisionApplicability: nextRules.length > 0 ? nextRules : null,
    };
  });
}

export type GeneralProjectChoicesMap = Record<string, string>;

/** Merge general decisions array into scheduling_prerequisites for save (preserves other keys). */
export function setGeneralProjectDecisionsOnPrerequisites(
  existing: Record<string, unknown>,
  decisions: GeneralProjectDecision[]
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing };
  if (decisions.length === 0) {
    delete next[GENERAL_PROJECT_DECISIONS_KEY];
  } else {
    next[GENERAL_PROJECT_DECISIONS_KEY] = decisions.map((d) => ({
      id: d.id,
      label: d.label,
      choices: d.choices.map((c) => ({ id: c.id, label: c.label })),
    }));
  }
  return next;
}
