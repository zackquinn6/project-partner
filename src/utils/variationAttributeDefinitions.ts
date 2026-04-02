import type { SupabaseClient } from '@supabase/supabase-js';

/** System-only row when `tools.attribute_definitions` cannot be written and there are no real variations. */
export const TOOL_ATTRIBUTE_SCHEMA_HOLDER_VARIATION_NAME = '__core_attribute_definitions__';

export function isToolAttributeSchemaHolderVariation(name: string): boolean {
  return name === TOOL_ATTRIBUTE_SCHEMA_HOLDER_VARIATION_NAME;
}

export function filterToolVariationsForDisplay<T extends { name: string }>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((r) => !isToolAttributeSchemaHolderVariation(r.name));
}

function isMissingAttributeDefinitionsColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42703' ||
    (typeof error.message === 'string' && error.message.includes('attribute_definitions'))
  );
}

/**
 * Canonical attribute definitions for a catalog tool live on `tools.attribute_definitions`.
 * Each `tool_variations` row keeps a copy for historical/runtime use; mirror via
 * `syncAttributeDefinitionsToAllVariations` when variants exist.
 *
 * If `tools.attribute_definitions` is not migrated yet, reads the latest copy from `tool_variations`.
 */
export async function fetchAttributeDefinitionsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string
): Promise<unknown[]> {
  const toolsRes = await supabase
    .from('tools')
    .select('attribute_definitions')
    .eq('id', coreItemId)
    .maybeSingle();

  if (toolsRes.error) {
    if (!isMissingAttributeDefinitionsColumn(toolsRes.error)) {
      throw toolsRes.error;
    }
  } else {
    const raw = toolsRes.data?.attribute_definitions;
    return Array.isArray(raw) ? raw : [];
  }

  const varRes = await supabase
    .from('tool_variations')
    .select('attribute_definitions')
    .eq('core_item_id', coreItemId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (varRes.error) {
    throw varRes.error;
  }
  const raw = varRes.data?.attribute_definitions;
  return Array.isArray(raw) ? raw : [];
}

/** @returns true when definitions were written to `tools.attribute_definitions`. */
export async function saveAttributeDefinitionsForCoreTool(
  supabase: SupabaseClient,
  coreItemId: string,
  defs: unknown[]
): Promise<boolean> {
  const { error } = await supabase
    .from('tools')
    .update({
      attribute_definitions: defs,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', coreItemId);

  if (error) {
    if (isMissingAttributeDefinitionsColumn(error)) {
      return false;
    }
    throw error;
  }
  return true;
}

async function countRealToolVariationsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('tool_variations')
    .select('id', { count: 'exact', head: true })
    .eq('core_item_id', coreItemId)
    .neq('name', TOOL_ATTRIBUTE_SCHEMA_HOLDER_VARIATION_NAME);

  if (error) throw error;
  if (count === null) {
    throw new Error(`Missing tool variation count for core item ${coreItemId}`);
  }
  return count;
}

async function upsertToolAttributeSchemaHolderVariation(
  supabase: SupabaseClient,
  coreItemId: string,
  defs: unknown[]
): Promise<void> {
  const { data: existing, error: selErr } = await supabase
    .from('tool_variations')
    .select('id')
    .eq('core_item_id', coreItemId)
    .eq('name', TOOL_ATTRIBUTE_SCHEMA_HOLDER_VARIATION_NAME)
    .maybeSingle();

  if (selErr) throw selErr;

  const now = new Date().toISOString();
  if (existing?.id) {
    const { error } = await supabase
      .from('tool_variations')
      .update({
        attribute_definitions: defs,
        updated_at: now,
      } as Record<string, unknown>)
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error: insErr } = await supabase.from('tool_variations').insert({
    id: crypto.randomUUID(),
    core_item_id: coreItemId,
    name: TOOL_ATTRIBUTE_SCHEMA_HOLDER_VARIATION_NAME,
    attributes: {},
    attribute_definitions: defs,
    updated_at: now,
  } as Record<string, unknown>);
  if (insErr) throw insErr;
}

export async function syncAttributeDefinitionsToAllVariations(
  supabase: SupabaseClient,
  coreItemId: string,
  defs: unknown[]
): Promise<void> {
  const { error } = await supabase
    .from('tool_variations')
    .update({
      attribute_definitions: defs,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('core_item_id', coreItemId);

  if (error) throw error;
}

/**
 * Save canonical defs on `tools` when possible, then mirror to `tool_variations`.
 * If the tools column is not available and there are no real variations, stores defs on a system-only
 * variation row so reads (e.g. Add Value) still resolve.
 */
export async function persistAttributeDefinitionsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string,
  defs: unknown[]
): Promise<void> {
  const savedToTools = await saveAttributeDefinitionsForCoreTool(supabase, coreItemId, defs);

  if (savedToTools) {
    await syncAttributeDefinitionsToAllVariations(supabase, coreItemId, defs);
    return;
  }

  const realVariationCount = await countRealToolVariationsForCoreItem(supabase, coreItemId);
  if (realVariationCount === 0) {
    await upsertToolAttributeSchemaHolderVariation(supabase, coreItemId, defs);
  } else {
    await syncAttributeDefinitionsToAllVariations(supabase, coreItemId, defs);
  }
}

export async function countVariationsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('tool_variations')
    .select('id', { count: 'exact' })
    .eq('core_item_id', coreItemId);

  if (error) throw error;
  if (count === null) {
    throw new Error(`Missing tool variation count for core item ${coreItemId}`);
  }

  return count;
}

/** Attribute definitions for material variants live on each `materials_variants` row (kept in sync). */
export async function fetchAttributeDefinitionsForMaterial(
  supabase: SupabaseClient,
  materialId: string
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('materials_variants')
    .select('attribute_definitions')
    .eq('material_id', materialId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const raw = data?.attribute_definitions;
  return Array.isArray(raw) ? raw : [];
}

export async function syncAttributeDefinitionsToAllMaterialVariants(
  supabase: SupabaseClient,
  materialId: string,
  defs: unknown[]
): Promise<void> {
  const { error } = await supabase
    .from('materials_variants')
    .update({
      attribute_definitions: defs,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('material_id', materialId);

  if (error) throw error;
}

export async function countMaterialVariantsForMaterial(
  supabase: SupabaseClient,
  materialId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('materials_variants')
    .select('id', { count: 'exact' })
    .eq('material_id', materialId);

  if (error) throw error;
  if (count === null) {
    throw new Error(`Missing material variation count for material ${materialId}`);
  }

  return count;
}
