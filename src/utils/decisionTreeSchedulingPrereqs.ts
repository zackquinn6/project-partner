/** Reserved key inside `projects.scheduling_prerequisites` JSON (ignored by scheduling string[] parser). */
export const DECISION_TREE_CONFIG_KEY = '__decision_tree_config__';

/** General project decisions (tile size, layout, etc.) stored alongside flow config. */
export const GENERAL_PROJECT_DECISIONS_KEY = '__general_project_decisions__';

/** Phase IDs marked blocked in the decision-tree blob (incorporated phases hidden from pickers). */
export function getBlockedPhaseIdsFromSchedulingPrerequisites(raw: unknown): Set<string> {
  const ids = new Set<string>();
  if (raw === null || raw === undefined) return ids;
  if (typeof raw !== 'object' || Array.isArray(raw)) return ids;
  const blob = (raw as Record<string, unknown>)[DECISION_TREE_CONFIG_KEY];
  if (blob === null || blob === undefined) return ids;
  if (typeof blob !== 'object' || Array.isArray(blob)) return ids;
  for (const [entityId, data] of Object.entries(blob)) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) continue;
    const t = (data as { type?: unknown }).type;
    if (t === 'blocked') {
      ids.add(entityId);
    }
  }
  return ids;
}
