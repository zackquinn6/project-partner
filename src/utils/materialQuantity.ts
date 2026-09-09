/**
 * Material quantity math: step qty × scope scale × (1+waste) → packages.
 * Uses fields when present on step materials; otherwise sensible fallbacks.
 */

export type MaterialQtyInput = {
  quantity?: number | string | null;
  unit?: string | null;
  unit_size?: string | null;
  /** Coverage area/length per package unit (e.g. sq ft per gallon, lf per box) */
  coveragePerUnit?: number | string | null;
  coverage_per_unit?: number | string | null;
  /** Waste fraction 0–1 (e.g. 0.1 = 10%). */
  wasteFactor?: number | string | null;
  waste_factor?: number | string | null;
  /** Units per package / pack size for rounding up. */
  packSize?: number | string | null;
  pack_size?: number | string | null;
};

export type MaterialRiskLevel = 'basics-only' | 'balanced' | 'contingency-on-everything';

const RISK_WASTE: Record<MaterialRiskLevel, number> = {
  'basics-only': 0.05,
  balanced: 0.1,
  'contingency-on-everything': 0.2,
};

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

/** Parse pack size from unit_size strings like "1 gal", "50 sq ft", "box of 12". */
export function parsePackSizeFromUnitSize(unitSize: string | null | undefined): number | null {
  if (!unitSize || !unitSize.trim()) return null;
  const boxMatch = unitSize.match(/(?:box|pack|case)\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
  if (boxMatch) return parseFloat(boxMatch[1]);
  const leading = unitSize.match(/^(\d+(?:\.\d+)?)/);
  if (leading) return parseFloat(leading[1]);
  return null;
}

/**
 * Project scope scale relative to template typical size.
 * Example: typical 100 sq ft, user sized 250 → scale 2.5 for coverage-based materials.
 */
export function resolveScopeScale(params: {
  initialSizing?: string | number | null;
  typicalProjectSize?: number | string | null;
  spaceSizingTotal?: number | null;
}): number {
  const typical = toPositiveNumber(params.typicalProjectSize, 0);
  const fromSpaces = toPositiveNumber(params.spaceSizingTotal, 0);
  const fromInitial =
    typeof params.initialSizing === 'number'
      ? params.initialSizing
      : toPositiveNumber(params.initialSizing, 0);

  const scope = fromSpaces > 0 ? fromSpaces : fromInitial;
  if (scope <= 0) return 1;
  if (typical <= 0) return 1;
  return scope / typical;
}

export function wasteFactorForRisk(
  risk: MaterialRiskLevel | string | null | undefined,
  materialWaste?: number | string | null
): number {
  const explicit = materialWaste != null && materialWaste !== ''
    ? toPositiveNumber(materialWaste, NaN)
    : NaN;
  if (Number.isFinite(explicit)) {
    return explicit > 1 ? explicit / 100 : explicit;
  }
  if (risk && risk in RISK_WASTE) {
    return RISK_WASTE[risk as MaterialRiskLevel];
  }
  return RISK_WASTE.balanced;
}

export type ComputedMaterialQty = {
  /** Raw step quantity contribution before scaling */
  baseQuantity: number;
  /** After scope scale */
  scaledQuantity: number;
  /** After waste */
  withWaste: number;
  /** Final buy quantity (rounded up to packs) */
  buyQuantity: number;
  packSize: number;
  wasteFactor: number;
  scopeScale: number;
  explanation: string;
};

/**
 * Compute buy quantity for one material line.
 * - If coveragePerUnit is set: needed = scopeAmount / coverage, then waste + packs
 * - Else: needed = baseQty * scopeScale (when material looks area/length scaled), else baseQty
 */
export function computeMaterialBuyQuantity(
  material: MaterialQtyInput,
  options: {
    scopeScale?: number;
    /** Absolute scope amount in scaling units (sq ft, lf, etc.) when known */
    scopeAmount?: number | null;
    riskLevel?: MaterialRiskLevel | string | null;
  } = {}
): ComputedMaterialQty {
  const baseQuantity = toPositiveNumber(material.quantity, 1);
  const scopeScale = options.scopeScale && options.scopeScale > 0 ? options.scopeScale : 1;
  const wasteFactor = wasteFactorForRisk(
    options.riskLevel,
    material.wasteFactor ?? material.waste_factor
  );
  const coverage = toPositiveNumber(
    material.coveragePerUnit ?? material.coverage_per_unit,
    0
  );
  const packFromField = toPositiveNumber(material.packSize ?? material.pack_size, 0);
  const packFromUnit = parsePackSizeFromUnitSize(material.unit_size) || 0;
  const packSize = packFromField > 0 ? packFromField : packFromUnit > 0 ? packFromUnit : 1;

  let scaledQuantity: number;
  let mode: string;

  if (coverage > 0 && options.scopeAmount && options.scopeAmount > 0) {
    scaledQuantity = options.scopeAmount / coverage;
    mode = `scope ${options.scopeAmount} ÷ coverage ${coverage}`;
  } else if (coverage > 0 && scopeScale !== 1) {
    // Template qty assumed sized for typical project; scale with scope
    scaledQuantity = baseQuantity * scopeScale;
    mode = `base ${baseQuantity} × scope scale ${scopeScale.toFixed(2)}`;
  } else if (scopeScale !== 1 && looksScalableUnit(material.unit)) {
    scaledQuantity = baseQuantity * scopeScale;
    mode = `base ${baseQuantity} × scope scale ${scopeScale.toFixed(2)} (${material.unit || 'unit'})`;
  } else {
    scaledQuantity = baseQuantity;
    mode = `base ${baseQuantity}`;
  }

  const withWaste = scaledQuantity * (1 + wasteFactor);
  const packSizeSafe = packSize > 0 ? packSize : 1;
  const packs = Math.max(1, Math.ceil(withWaste / packSizeSafe));
  const buy = packs;

  const explanation = [
    mode,
    `+${Math.round(wasteFactor * 100)}% waste → ${withWaste.toFixed(2)}`,
    packSizeSafe > 1 ? `÷ pack ${packSizeSafe} → ${buy} pack(s)` : `→ ${buy} unit(s)`,
  ].join('; ');

  return {
    baseQuantity,
    scaledQuantity,
    withWaste,
    buyQuantity: buy,
    packSize: packSizeSafe,
    wasteFactor,
    scopeScale,
    explanation,
  };
}

function looksScalableUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase();
  return (
    u.includes('sq') ||
    u.includes('ft') ||
    u.includes('lf') ||
    u.includes('linear') ||
    u.includes('gallon') ||
    u.includes('gal') ||
    u.includes('bag') ||
    u.includes('box') ||
    u.includes('sheet') ||
    u.includes('roll')
  );
}

/** Aggregate one material occurrence into a running total (sum of buy qtys). */
export function addMaterialOccurrence(
  existingTotal: number,
  material: MaterialQtyInput,
  options: {
    scopeScale?: number;
    scopeAmount?: number | null;
    riskLevel?: MaterialRiskLevel | string | null;
  }
): { total: number; last: ComputedMaterialQty } {
  const last = computeMaterialBuyQuantity(material, options);
  return { total: existingTotal + last.buyQuantity, last };
}
