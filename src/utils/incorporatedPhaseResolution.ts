import { supabase } from '@/integrations/supabase/client';

export type ResolvedIncorporatedSourcePhase = {
  sourcePhaseId: string;
  name: string;
  description: string | null;
};

function normalizePhaseName(name: string): string {
  return name.trim().toLowerCase();
}

function uniqueByExactName(
  rows: { id: string; name: string; description: string | null }[] | null | undefined,
  legacyName: string
): { id: string; name: string; description: string | null } | null {
  const matches = (rows ?? []).filter((r) => r.name === legacyName);
  if (matches.length === 1) {
    return matches[0];
  }
  return null;
}

function uniqueByNormalizedName(
  rows: { id: string; name: string; description: string | null }[] | null | undefined,
  legacyName: string
): { id: string; name: string; description: string | null } | null {
  const target = normalizePhaseName(legacyName);
  if (!target) {
    return null;
  }
  const matches = (rows ?? []).filter((r) => normalizePhaseName(r.name) === target);
  if (matches.length === 1) {
    return matches[0];
  }
  return null;
}

async function loadPhasesForProject(
  projectId: string
): Promise<{ id: string; name: string; description: string | null }[]> {
  const { data, error } = await supabase
    .from('project_phases')
    .select('id, name, description')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to load phases for source project: ${error.message}`);
  }
  return data ?? [];
}

function toResolved(row: { id: string; name: string; description: string | null }): ResolvedIncorporatedSourcePhase {
  return {
    sourcePhaseId: row.id,
    name: row.name,
    description: row.description
  };
}

/**
 * Resolves which source `project_phases` row supplies content for an incorporated phase.
 * Prefers `source_phase_id` (stable across renames). If the anchor row belongs to an older
 * revision than `latestSourceProjectId`, resolves the counterpart in the latest project by
 * position_rule, position_value, and is_standard.
 */
export async function resolveIncorporatedSourcePhase(
  latestSourceProjectId: string,
  sourcePhaseId: string | null | undefined,
  /** Only used when source_phase_id is missing (pre-migration rows). */
  legacyIncorporatingPhaseName: string,
  /**
   * `project_phases.source_project_id` on the incorporating row (may point at an older published revision).
   * Used to find a phase id by name when the latest revision renamed phases.
   */
  linkedSourceProjectId?: string | null
): Promise<ResolvedIncorporatedSourcePhase> {
  if (sourcePhaseId) {
    const { data: anchor, error } = await supabase
      .from('project_phases')
      .select(
        'id, project_id, name, description, position_rule, position_value, is_standard'
      )
      .eq('id', sourcePhaseId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load incorporated source phase anchor: ${error.message}`);
    }
    if (!anchor) {
      throw new Error(
        `Incorporated source_phase_id not found: ${sourcePhaseId}. The source phase may have been deleted.`
      );
    }

    if (anchor.project_id === latestSourceProjectId) {
      return {
        sourcePhaseId: anchor.id,
        name: anchor.name,
        description: anchor.description
      };
    }

    let counterpartQuery = supabase
      .from('project_phases')
      .select('id, name, description')
      .eq('project_id', latestSourceProjectId)
      .eq('position_rule', anchor.position_rule)
      .eq('is_standard', anchor.is_standard ?? false);

    if (anchor.position_value === null || anchor.position_value === undefined) {
      counterpartQuery = counterpartQuery.is('position_value', null);
    } else {
      counterpartQuery = counterpartQuery.eq('position_value', anchor.position_value);
    }

    const { data: counterparts, error: cErr } = await counterpartQuery;

    if (cErr) {
      throw new Error(
        `Failed to resolve incorporated source phase in latest revision: ${cErr.message}`
      );
    }
    if (!counterparts?.length) {
      throw new Error(
        `Incorporated source phase could not be mapped to the latest source project revision (anchor ${sourcePhaseId}).`
      );
    }
    if (counterparts.length > 1) {
      throw new Error(
        `Ambiguous incorporated source phase: ${counterparts.length} phases match position in latest source project.`
      );
    }

    const row = counterparts[0];
    return {
      sourcePhaseId: row.id,
      name: row.name,
      description: row.description
    };
  }

  const latestRows = await loadPhasesForProject(latestSourceProjectId);

  const exactLatest = uniqueByExactName(latestRows, legacyIncorporatingPhaseName);
  if (exactLatest) {
    return toResolved(exactLatest);
  }

  const normLatest = uniqueByNormalizedName(latestRows, legacyIncorporatingPhaseName);
  if (normLatest) {
    return toResolved(normLatest);
  }

  if (linkedSourceProjectId && linkedSourceProjectId !== latestSourceProjectId) {
    const linkedRows = await loadPhasesForProject(linkedSourceProjectId);

    const exactLinked = uniqueByExactName(linkedRows, legacyIncorporatingPhaseName);
    if (exactLinked) {
      return resolveIncorporatedSourcePhase(
        latestSourceProjectId,
        exactLinked.id,
        legacyIncorporatingPhaseName,
        linkedSourceProjectId
      );
    }

    const normLinked = uniqueByNormalizedName(linkedRows, legacyIncorporatingPhaseName);
    if (normLinked) {
      return resolveIncorporatedSourcePhase(
        latestSourceProjectId,
        normLinked.id,
        legacyIncorporatingPhaseName,
        linkedSourceProjectId
      );
    }
  }

  throw new Error(
    `Incorporated phase has no source_phase_id and no unambiguous phase match in the latest source project${
      linkedSourceProjectId && linkedSourceProjectId !== latestSourceProjectId
        ? ' or in the linked source revision'
        : ''
    } (exact or case-insensitive trimmed name). Run 2026_04_03_migration_project_phases_source_phase_id_backfill.sql, set source_phase_id on the row, or re-incorporate the phase.`
  );
}
