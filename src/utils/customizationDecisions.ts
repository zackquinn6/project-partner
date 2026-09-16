import type { ProjectRun } from '@/interfaces/ProjectRun';
import { areSpaceRequiredDecisionsComplete } from '@/components/ProjectCustomizer/SpaceDecisionFlow';

/**
 * Normalize customization_decisions from API (object or JSON string) for client reads.
 */
export function parseCustomizationDecisions(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/** True when Planning Studio Scope (project customizer) has been checkoff-completed for this run. */
export function isPlanningScopeComplete(customizationDecisions: unknown): boolean {
  const decisions = parseCustomizationDecisions(customizationDecisions);
  const completed = decisions.planning_wizard_completed_tools;
  return Array.isArray(completed) && completed.includes('scope');
}

type SpaceDecisionMap = Record<
  string,
  {
    standardDecisions: Record<string, string[]>;
    ifNecessaryWork: Record<string, string[]>;
  }
>;

/**
 * True when saved Scope content has a home, at least one space, and required
 * space decisions - the Scope decision path itself.
 */
export function isCustomizationContentComplete(
  projectRun: Pick<ProjectRun, 'home_id' | 'phases' | 'customization_decisions'> | null | undefined
): boolean {
  if (!projectRun?.home_id) return false;
  const decisions = parseCustomizationDecisions(projectRun.customization_decisions);
  const spaces = Array.isArray(decisions.spaces) ? decisions.spaces : [];
  if (spaces.length === 0) return false;

  const spaceDecisionsRaw = decisions.spaceDecisions;
  const spaceDecisions: SpaceDecisionMap =
    spaceDecisionsRaw && typeof spaceDecisionsRaw === 'object' && !Array.isArray(spaceDecisionsRaw)
      ? (spaceDecisionsRaw as SpaceDecisionMap)
      : {};

  const generalChoicesRaw = decisions.generalProjectChoices;
  const generalChoices =
    generalChoicesRaw && typeof generalChoicesRaw === 'object' && !Array.isArray(generalChoicesRaw)
      ? (generalChoicesRaw as Record<string, string>)
      : {};
  // If general choices were started, every stored key must have a value (empty map is ok when none apply).
  if (Object.values(generalChoices).some((value) => typeof value !== 'string' || value.trim() === '')) {
    return false;
  }

  return spaces.every((space) => {
    if (!space || typeof space !== 'object') return false;
    const id = (space as { id?: unknown }).id;
    if (typeof id !== 'string' || !id) return false;
    return areSpaceRequiredDecisionsComplete(projectRun as ProjectRun, id, spaceDecisions);
  });
}

/**
 * Workflow may start only when Studio Scope is checkoff-complete and Scope content is complete.
 */
export function isScopeReadyForWorkflow(
  projectRun: Pick<ProjectRun, 'home_id' | 'phases' | 'customization_decisions'> | null | undefined
): boolean {
  if (!projectRun) return false;
  return (
    isPlanningScopeComplete(projectRun.customization_decisions) &&
    isCustomizationContentComplete(projectRun)
  );
}
