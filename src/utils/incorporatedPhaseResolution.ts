import { supabase } from '@/integrations/supabase/client';

export type ResolvedIncorporatedSourcePhase = {
  sourcePhaseId: string;
  name: string;
  description: string | null;
};

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
  legacyIncorporatingPhaseName: string
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

  const { data: row, error: legacyError } = await supabase
    .from('project_phases')
    .select('id, name, description')
    .eq('project_id', latestSourceProjectId)
    .eq('name', legacyIncorporatingPhaseName)
    .maybeSingle();

  if (legacyError) {
    throw new Error(`Legacy incorporated phase resolution failed: ${legacyError.message}`);
  }
  if (!row) {
    throw new Error(
      `Incorporated phase has no source_phase_id and no matching phase name in the latest source project. Run migration 2026_04_02_migration_project_phases_source_phase_id.sql and ensure backfill completed, or re-incorporate the phase.`
    );
  }

  return {
    sourcePhaseId: row.id,
    name: row.name,
    description: row.description
  };
}
