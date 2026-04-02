/**
 * `tool_variations.pricing` JSONB entries use `model_id` as an opaque key.
 * There is no separate per-variation models table; we derive display rows from
 * the variation, optional core catalog name, and any `model_id`s present in pricing.
 */

export interface PricingModelRow {
  id: string;
  variation_instance_id: string;
  model_name: string;
  manufacturer?: string;
  model_number?: string;
  upc_code?: string;
}

function primaryVariationLabel(
  variationId: string,
  variationName: string | null | undefined,
  variationSku: string | null | undefined
): string {
  const name = variationName?.trim();
  const sku = variationSku?.trim();
  if (name && sku) return `${name} · ${sku}`;
  if (name) return name;
  if (sku) return sku;
  return variationId;
}

export function buildPricingModelRowsForVariation(input: {
  variationId: string;
  coreItemId: string | null | undefined;
  coreItemDisplayName: string | null | undefined;
  variationName: string | null | undefined;
  variationSku: string | null | undefined;
  pricing: readonly { model_id?: string }[];
}): PricingModelRow[] {
  const {
    variationId,
    coreItemId,
    coreItemDisplayName,
    variationName,
    variationSku,
    pricing,
  } = input;

  const seen = new Set<string>();
  const out: PricingModelRow[] = [];

  const add = (id: string, model_name: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      variation_instance_id: variationId,
      model_name,
    });
  };

  add(variationId, primaryVariationLabel(variationId, variationName, variationSku));

  if (coreItemId && coreItemId !== variationId) {
    const coreLabel = coreItemDisplayName?.trim() || coreItemId;
    add(coreItemId, coreLabel);
  }

  for (const p of pricing) {
    const mid = p.model_id;
    if (!mid || seen.has(mid)) continue;
    add(mid, mid);
  }

  return out;
}
