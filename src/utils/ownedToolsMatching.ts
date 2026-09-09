import { supabase } from '@/integrations/supabase/client';

export type OwnedToolRecord = {
  id: string;
  tool_id?: string | null;
  name: string;
  item?: string;
  quantity?: number;
};

export type ToolRequirementLike = {
  id?: string;
  name?: string;
  item?: string;
  tool_id?: string;
  library_tool_id?: string;
  alternates?: unknown;
};

function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

/** Expand step/catalog alternates into matchable names / ids. */
export function expandToolAlternateKeys(alternates: unknown): string[] {
  if (!alternates) return [];
  if (typeof alternates === 'string') {
    const trimmed = alternates.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return expandToolAlternateKeys(parsed);
    } catch {
      return [normalizeName(trimmed)].filter(Boolean);
    }
  }
  if (!Array.isArray(alternates)) return [];
  const keys: string[] = [];
  for (const alt of alternates) {
    if (typeof alt === 'string') {
      const n = normalizeName(alt);
      if (n) keys.push(n);
      continue;
    }
    if (alt && typeof alt === 'object') {
      const obj = alt as Record<string, unknown>;
      const name = normalizeName(
        (obj.name as string) || (obj.item as string) || (obj.label as string)
      );
      if (name) keys.push(name);
      if (typeof obj.core_tool_id === 'string' && obj.core_tool_id) {
        keys.push(`id:${obj.core_tool_id}`);
      }
      if (typeof obj.variation_id === 'string' && obj.variation_id) {
        keys.push(`id:${obj.variation_id}`);
      }
    }
  }
  return keys;
}

function ownedMatchKeys(owned: OwnedToolRecord): string[] {
  const keys: string[] = [];
  const name = normalizeName(owned.name);
  const item = normalizeName(owned.item);
  if (name) keys.push(name);
  if (item && item !== name) keys.push(item);
  if (owned.tool_id) keys.push(`id:${owned.tool_id}`);
  if (owned.id) keys.push(`id:${owned.id}`);
  return keys;
}

function requirementMatchKeys(tool: ToolRequirementLike): string[] {
  const keys: string[] = [];
  const name = normalizeName(tool.name);
  const item = normalizeName(tool.item);
  if (name) keys.push(name);
  if (item && item !== name) keys.push(item);
  if (tool.id) keys.push(`id:${tool.id}`);
  if (tool.tool_id) keys.push(`id:${tool.tool_id}`);
  if (tool.library_tool_id) keys.push(`id:${tool.library_tool_id}`);
  keys.push(...expandToolAlternateKeys(tool.alternates));
  return keys;
}

/** True if the user owns the primary tool or any listed alternate. */
export function isToolRequirementOwned(
  tool: ToolRequirementLike,
  ownedTools: OwnedToolRecord[]
): boolean {
  if (!ownedTools.length) return false;
  const ownedKeys = new Set(ownedTools.flatMap(ownedMatchKeys));
  return requirementMatchKeys(tool).some((k) => ownedKeys.has(k));
}

/**
 * Load merged owned tools from user_tools + user_profiles.owned_tools.
 */
export async function loadUserOwnedTools(userId: string): Promise<OwnedToolRecord[]> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('owned_tools')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('loadUserOwnedTools profile', profileError);
  }

  const fromProfileRaw = profile?.owned_tools;
  const fromProfile: OwnedToolRecord[] = Array.isArray(fromProfileRaw)
    ? (fromProfileRaw as OwnedToolRecord[]).map((t) => ({
        id: String(t.id),
        tool_id: t.tool_id ?? null,
        name: t.name || t.item || '',
        item: t.item ?? t.name ?? '',
        quantity: t.quantity,
      }))
    : [];

  const { data, error } = await supabase
    .from('user_tools')
    .select('id, tool_id, name, description, quantity')
    .eq('user_id', userId);

  if (error) {
    console.error('loadUserOwnedTools user_tools', error);
  }

  const fromTable: OwnedToolRecord[] = (data || []).map((row) => ({
    id: String(row.id),
    tool_id: row.tool_id,
    name: row.name || '',
    item: row.name || '',
    quantity: row.quantity ?? 1,
  }));

  const byId = new Map<string, OwnedToolRecord>();
  for (const t of fromProfile) {
    if (t.id) byId.set(t.id, t);
  }
  for (const t of fromTable) {
    if (!t.id) continue;
    const prev = byId.get(t.id);
    byId.set(t.id, {
      ...prev,
      ...t,
      name: t.name || prev?.name || '',
      item: t.item || t.name || prev?.item || '',
      tool_id: t.tool_id || prev?.tool_id || null,
    });
  }

  return Array.from(byId.values()).filter((t) => t.name || t.tool_id);
}
