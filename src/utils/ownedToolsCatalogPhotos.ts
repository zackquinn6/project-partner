import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type ToolVariationPhotoRow = Pick<
  Database['public']['Tables']['tool_variations']['Row'],
  'core_item_id' | 'name' | 'sku' | 'photo_url'
>;

export interface OwnedToolPhotoFields {
  tool_id?: string | null;
  model_name?: string | null;
  name?: string | null;
  item?: string | null;
  photo_url?: string | null;
  user_photo_url?: string | null;
}

export async function fetchOwnedToolsPhotoResolution(
  client: SupabaseClient<Database>,
  toolIds: string[]
): Promise<{
  corePhotoById: Map<string, string | null>;
  variationsByCore: Map<string, ToolVariationPhotoRow[]>;
}> {
  if (toolIds.length === 0) {
    return { corePhotoById: new Map(), variationsByCore: new Map() };
  }

  const [corePhotosRes, variationPhotosRes] = await Promise.all([
    client.from('tools').select('id, photo_url').in('id', toolIds),
    client
      .from('tool_variations')
      .select('core_item_id, name, sku, photo_url')
      .eq('item_type', 'tools')
      .in('core_item_id', toolIds),
  ]);

  if (corePhotosRes.error) throw corePhotosRes.error;
  if (variationPhotosRes.error) throw variationPhotosRes.error;

  const corePhotoById = new Map<string, string | null>(
    (corePhotosRes.data || []).map((r) => [r.id, r.photo_url])
  );

  const variationsByCore = new Map<string, ToolVariationPhotoRow[]>();
  for (const v of variationPhotosRes.data || []) {
    const list = variationsByCore.get(v.core_item_id) || [];
    list.push(v);
    variationsByCore.set(v.core_item_id, list);
  }

  return { corePhotoById, variationsByCore };
}

export function resolveCatalogPhotoForOwnedTool(
  tool: OwnedToolPhotoFields,
  corePhotoById: Map<string, string | null>,
  variationsByCore: Map<string, ToolVariationPhotoRow[]>
): string | null {
  const coreId = tool.tool_id;
  if (!coreId) {
    return typeof tool.photo_url === 'string' ? tool.photo_url : null;
  }

  const variations = variationsByCore.get(coreId) || [];
  const displayName = (tool.name || tool.item || '').trim();
  const matchedVariation = variations.find(
    (v) =>
      (tool.model_name &&
        v.sku &&
        tool.model_name.toLowerCase().trim() === String(v.sku).toLowerCase().trim()) ||
      (displayName &&
        v.name &&
        displayName.toLowerCase() === String(v.name).toLowerCase().trim())
  );

  if (matchedVariation?.photo_url) {
    return matchedVariation.photo_url;
  }

  const core = corePhotoById.get(coreId);
  return core ?? null;
}

export function enrichOwnedToolsWithCatalogPhotos<T extends OwnedToolPhotoFields>(
  tools: T[],
  corePhotoById: Map<string, string | null>,
  variationsByCore: Map<string, ToolVariationPhotoRow[]>
): T[] {
  return tools.map((tool) => {
    if (!tool.tool_id) {
      return tool;
    }
    const photo_url = resolveCatalogPhotoForOwnedTool(tool, corePhotoById, variationsByCore);
    return { ...tool, photo_url };
  });
}

export function collectOwnedToolCoreIds(tools: OwnedToolPhotoFields[]): string[] {
  return Array.from(new Set(tools.map((t) => t.tool_id).filter((id): id is string => Boolean(id))));
}
