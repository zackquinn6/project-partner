import { supabase } from '@/integrations/supabase/client';
import type { Phase } from '@/interfaces/Project';
import type { QualityGoal } from '@/utils/qualityGoal';

export type ProjectQualityLevelRow = {
  id: string;
  project_id: string;
  quality_level: QualityGoal;
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

/**
 * Host template id plus distinct source_project_id values from linked/adopted phases.
 * Quality-impact content is displayed from each source, never copied onto the host.
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

export async function loadProjectQualityLevelBundles(
  projectIds: string[],
): Promise<ProjectQualityLevelsBundle[]> {
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
      'id, project_id, quality_level, outcome_summary, process_summary, vs_lower_summary, example_image_urls',
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
    levels: (levelsByProject.get(id) || []).sort((a, b) => {
      const order = { good: 0, great: 1, professional: 2 };
      return order[a.quality_level] - order[b.quality_level];
    }),
  }));
}

export function levelForGoal(
  bundle: ProjectQualityLevelsBundle,
  goal: QualityGoal,
): ProjectQualityLevelRow | undefined {
  return bundle.levels.find((l) => l.quality_level === goal);
}
