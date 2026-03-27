import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Attribute type/value schema for a tool lives on each `tool_variations` row (kept in sync).
 * Read from any one row for the core tool (latest updated_at).
 */
export async function fetchAttributeDefinitionsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('tool_variations')
    .select('attribute_definitions')
    .eq('core_item_id', coreItemId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const raw = data?.attribute_definitions;
  return Array.isArray(raw) ? raw : [];
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

export async function countVariationsForCoreItem(
  supabase: SupabaseClient,
  coreItemId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('tool_variations')
    .select('*', { count: 'exact', head: true })
    .eq('core_item_id', coreItemId);

  if (error) throw error;
  return count ?? 0;
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
    .select('*', { count: 'exact', head: true })
    .eq('material_id', materialId);

  if (error) throw error;
  return count ?? 0;
}
