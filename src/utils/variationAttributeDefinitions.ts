import type { SupabaseClient } from '@supabase/supabase-js';

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

export async function saveAttributeDefinitionsForCoreTool(
  supabase: SupabaseClient,
  coreItemId: string,
  defs: unknown[]
): Promise<void> {
  const { error } = await supabase
    .from('tools')
    .update({
      attribute_definitions: defs,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', coreItemId);

  if (error) {
    if (isMissingAttributeDefinitionsColumn(error)) {
      return;
    }
    throw error;
  }
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

/** Save canonical defs on `tools`, then copy to all rows in `tool_variations` for this core tool (if any). */
export async function persistAttributeDefinitionsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string,
  defs: unknown[]
): Promise<void> {
  await saveAttributeDefinitionsForCoreTool(supabase, coreItemId, defs);
  await syncAttributeDefinitionsToAllVariations(supabase, coreItemId, defs);
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
