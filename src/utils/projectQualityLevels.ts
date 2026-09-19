import { supabase } from '@/integrations/supabase/client';
import type { Phase } from '@/interfaces/Project';
import type { QualityGoal } from '@/utils/qualityGoal';

export type ProjectQualityLevelRow = {
  id: string;
  project_id: string;
  quality_level: QualityGoal;
  /** Short kickoff Goals blurb; null when not authored yet. */
  kickoff_summary: string | null;
  outcome_summary: string;
  process_summary: string;
  vs_lower_summary: string | null;
  example_image_urls: string[];
};

export type ProjectQualityLevelsBundle = {
  projectId: string;
  projectName: string;
  levels: ProjectQualityLevelRow[];
};

function parseExampleImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
}

function sortLevels(levels: ProjectQualityLevelRow[]): ProjectQualityLevelRow[] {
  const order = { good: 0, great: 1, professional: 2 };
  return [...levels].sort(
    (a, b) => order[a.quality_level] - order[b.quality_level],
  );
}

/**
 * Host template id plus distinct source_project_id values from linked/adopted phases.
 * Quality-impact content is displayed from each source, never copied onto the host template.
 */
export function contributingQualityProjectIds(
  hostProjectId: string | null | undefined,
  phases: Phase[] | null | undefined,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  const push = (id: string | null | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  push(hostProjectId ?? undefined);

  for (const phase of phases || []) {
    if (phase.sourceProjectId) {
      push(phase.sourceProjectId);
    }
  }

  return ids;
}

/** Freeze catalog quality-impact rows onto a run (host + adopted sources). */
export async function copyQualityLevelsToProjectRun(
  projectRunId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'copy_project_quality_levels_to_run',
    { p_run_id: projectRunId },
  );
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

async function loadBundlesFromRunSnapshot(
  projectRunId: string,
  preferredOrder: string[],
): Promise<ProjectQualityLevelsBundle[] | null> {
  const { data, error } = await supabase
    .from('project_run_quality_levels')
    .select(
      'id, source_project_id, source_project_name, quality_level, kickoff_summary, outcome_summary, process_summary, vs_lower_summary, example_image_urls',
    )
    .eq('project_run_id', projectRunId);

  if (error) throw error;
  if (!data?.length) return null;

  const levelsByProject = new Map<string, ProjectQualityLevelRow[]>();
  const nameById = new Map<string, string>();

  for (const row of data) {
    const qualityLevel = row.quality_level;
    if (
      qualityLevel !== 'good' &&
      qualityLevel !== 'great' &&
      qualityLevel !== 'professional'
    ) {
      continue;
    }
    nameById.set(row.source_project_id, row.source_project_name);
    const list = levelsByProject.get(row.source_project_id) || [];
    list.push({
      id: row.id,
      project_id: row.source_project_id,
      quality_level: qualityLevel,
      kickoff_summary:
        typeof row.kickoff_summary === 'string' && row.kickoff_summary.trim()
          ? row.kickoff_summary.trim()
          : null,
      outcome_summary: row.outcome_summary,
      process_summary: row.process_summary,
      vs_lower_summary: row.vs_lower_summary,
      example_image_urls: parseExampleImageUrls(row.example_image_urls),
    });
    levelsByProject.set(row.source_project_id, list);
  }

  const orderedIds = [
    ...preferredOrder.filter((id) => levelsByProject.has(id)),
    ...[...levelsByProject.keys()].filter((id) => !preferredOrder.includes(id)),
  ];

  return orderedIds.map((id) => ({
    projectId: id,
    projectName: nameById.get(id) || id,
    levels: sortLevels(levelsByProject.get(id) || []),
  }));
}

export async function loadProjectQualityLevelBundles(
  projectIds: string[],
  options?: { projectRunId?: string | null },
): Promise<ProjectQualityLevelsBundle[]> {
  if (options?.projectRunId) {
    const fromRun = await loadBundlesFromRunSnapshot(
      options.projectRunId,
      projectIds,
    );
    if (fromRun) return fromRun;
  }

  if (projectIds.length === 0) return [];

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds);

  if (projectsError) {
    throw projectsError;
  }

  const { data: levels, error: levelsError } = await supabase
    .from('project_quality_levels')
    .select(
      'id, project_id, quality_level, kickoff_summary, outcome_summary, process_summary, vs_lower_summary, example_image_urls',
    )
    .in('project_id', projectIds);

  if (levelsError) {
    throw levelsError;
  }

  const nameById = new Map(
    (projects || []).map((p) => [p.id as string, (p.name as string) || p.id]),
  );

  const levelsByProject = new Map<string, ProjectQualityLevelRow[]>();
  for (const row of levels || []) {
    const qualityLevel = row.quality_level;
    if (
      qualityLevel !== 'good' &&
      qualityLevel !== 'great' &&
      qualityLevel !== 'professional'
    ) {
      continue;
    }
    const parsed: ProjectQualityLevelRow = {
      id: row.id,
      project_id: row.project_id,
      quality_level: qualityLevel,
      kickoff_summary:
        typeof row.kickoff_summary === 'string' && row.kickoff_summary.trim()
          ? row.kickoff_summary.trim()
          : null,
      outcome_summary: row.outcome_summary,
      process_summary: row.process_summary,
      vs_lower_summary: row.vs_lower_summary,
      example_image_urls: parseExampleImageUrls(row.example_image_urls),
    };
    const list = levelsByProject.get(row.project_id) || [];
    list.push(parsed);
    levelsByProject.set(row.project_id, list);
  }

  return projectIds.map((id) => ({
    projectId: id,
    projectName: nameById.get(id) || id,
    levels: sortLevels(levelsByProject.get(id) || []),
  }));
}

export function levelForGoal(
  bundle: ProjectQualityLevelsBundle,
  goal: QualityGoal,
): ProjectQualityLevelRow | undefined {
  return bundle.levels.find((l) => l.quality_level === goal);
}

/** Outcome summaries for the goal across every contributing source that has a row. */
export function expectedFinishSummariesForGoal(
  bundles: ProjectQualityLevelsBundle[],
  goal: QualityGoal,
): { projectName: string; outcome_summary: string }[] {
  const out: { projectName: string; outcome_summary: string }[] = [];
  for (const bundle of bundles) {
    const level = levelForGoal(bundle, goal);
    if (level) {
      out.push({
        projectName: bundle.projectName,
        outcome_summary: level.outcome_summary,
      });
    }
  }
  return out;
}
