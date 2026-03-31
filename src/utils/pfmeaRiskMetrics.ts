/**
 * PFMEA RPN / Action Priority — same rules as PFMEAManagement.tsx (keep in sync).
 */

export interface PfmeaControlLike {
  control_type: string;
  detection_score?: number | null;
}

export interface PfmeaCauseLike {
  id: string;
  occurrence_score: number;
}

export interface PfmeaEffectLike {
  severity_score: number;
}

export interface PfmeaFailureModeLike {
  id: string;
  operation_step_id: string;
  severity_score: number;
  pfmea_potential_effects: PfmeaEffectLike[];
  pfmea_potential_causes: PfmeaCauseLike[];
  pfmea_controls: PfmeaControlLike[];
}

export function maxPfmeaSeverityForFailureMode(fm: PfmeaFailureModeLike): number {
  if (fm.pfmea_potential_effects.length > 0) {
    return Math.max(...fm.pfmea_potential_effects.map((e) => e.severity_score));
  }
  return fm.severity_score;
}

export function calculateRPN(fm: PfmeaFailureModeLike, cause: PfmeaCauseLike | null): number {
  const severity = maxPfmeaSeverityForFailureMode(fm);
  const occurrence = cause?.occurrence_score ?? 10;
  const detectionScores = fm.pfmea_controls
    .filter((c) => c.control_type === 'detection' && c.detection_score != null)
    .map((c) => c.detection_score!);
  const minDetection = detectionScores.length > 0 ? Math.min(...detectionScores, 10) : 10;
  return Math.round(severity * occurrence * minDetection);
}

export function calculateActionPriority(fm: PfmeaFailureModeLike): 'H' | 'M' | 'L' {
  const s = Math.round(maxPfmeaSeverityForFailureMode(fm));
  const avgOccurrence =
    fm.pfmea_potential_causes.length > 0
      ? fm.pfmea_potential_causes.reduce((sum, c) => sum + c.occurrence_score, 0) / fm.pfmea_potential_causes.length
      : 10;
  const o = Math.round(avgOccurrence);
  const detectionScores = fm.pfmea_controls
    .filter((c) => c.control_type === 'detection' && c.detection_score != null)
    .map((c) => c.detection_score!);
  const d = detectionScores.length > 0 ? Math.min(...detectionScores) : 10;

  if (s >= 9) {
    if (o >= 8) return 'H';
    if (o >= 6) return 'H';
    if (o >= 4) return d === 1 ? 'M' : 'H';
    if (o >= 2) return d >= 7 ? 'H' : d >= 5 ? 'M' : 'L';
    return 'L';
  }
  if (s >= 7) {
    if (o >= 8) return 'H';
    if (o >= 6) return d === 1 ? 'M' : 'H';
    if (o >= 4) return d >= 7 ? 'H' : 'M';
    if (o >= 2) return d >= 5 ? 'M' : 'L';
    return 'L';
  }
  if (s >= 4) {
    if (o >= 8) return d >= 5 ? 'H' : 'M';
    if (o >= 6) return d === 1 ? 'L' : 'M';
    if (o >= 4) return d >= 7 ? 'M' : 'L';
    return 'L';
  }
  if (s >= 2) {
    if (o >= 8) return d >= 5 ? 'M' : 'L';
    return 'L';
  }
  return 'L';
}

export interface PfmeaAggregateMetrics {
  maxRpn: number;
  lineCount: number;
  uniqueRpnCount: number;
  high: number;
  medium: number;
  low: number;
  failureModeCount: number;
}

/** One PFMEA grid row per (failure mode × cause), or one row per FM if no causes. */
export function aggregatePfmeaMetrics(failureModes: PfmeaFailureModeLike[]): PfmeaAggregateMetrics {
  let maxRpn = 0;
  const rpnValues = new Set<number>();
  let lineCount = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const fm of failureModes) {
    const ap = calculateActionPriority(fm);
    if (ap === 'H') high += 1;
    else if (ap === 'M') medium += 1;
    else low += 1;

    const causes = fm.pfmea_potential_causes ?? [];
    if (causes.length === 0) {
      lineCount += 1;
      const r = calculateRPN(fm, null);
      maxRpn = Math.max(maxRpn, r);
      rpnValues.add(r);
    } else {
      for (const c of causes) {
        lineCount += 1;
        const r = calculateRPN(fm, c);
        maxRpn = Math.max(maxRpn, r);
        rpnValues.add(r);
      }
    }
  }

  return {
    maxRpn,
    lineCount,
    uniqueRpnCount: rpnValues.size,
    high,
    medium,
    low,
    failureModeCount: failureModes.length,
  };
}
