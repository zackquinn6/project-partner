import type { Output } from '@/interfaces/Project';

/** Stored on project_runs.quality_control_settings (jsonb) */
export type QualityControlSettings = {
  require_photos_per_step: boolean;
  /** true = every output must be completed; false = only critical outputs (non–"none" type) */
  require_all_outputs: boolean;
};

export const DEFAULT_QUALITY_CONTROL_SETTINGS: QualityControlSettings = {
  require_photos_per_step: false,
  require_all_outputs: true
};

export function mergeQualityControlSettings(raw: unknown): QualityControlSettings {
  if (raw === null || raw === undefined) {
    return { ...DEFAULT_QUALITY_CONTROL_SETTINGS };
  }
  if (typeof raw !== 'object') {
    return { ...DEFAULT_QUALITY_CONTROL_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    require_photos_per_step: o.require_photos_per_step === true,
    require_all_outputs: o.require_all_outputs !== false
  };
}

/** Critical = must count when require_all_outputs is false */
export function isOutputConsideredCritical(output: Output): boolean {
  return output.type !== 'none';
}

export function isOutputInQualityScope(
  output: Output,
  requireAllOutputs: boolean
): boolean {
  if (requireAllOutputs) return true;
  return isOutputConsideredCritical(output);
}

export function parseQualityControlSettingsColumn(
  raw: unknown
): QualityControlSettings | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return mergeQualityControlSettings(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') {
    return mergeQualityControlSettings(raw);
  }
  return undefined;
}
