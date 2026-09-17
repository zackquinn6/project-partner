/**
 * PFMEA scoring. The single source of truth for both the authoring grid and every consumer.
 *
 * Nothing here substitutes a score for a missing one. A line whose severity, occurrence, or
 * detection has not been authored is unscored, and unscored is reported as its own state.
 * The previous behaviour of standing in 10 for a missing occurrence or detection reported
 * maximum risk for analysis nobody had done, which is worse than reporting nothing.
 *
 * Priority comes from the Action Priority table in pfmea_action_priority_rules, retuned so
 * severity leads, occurrence weighs second, and detection cannot buy down either. RPN is
 * retained only to order lines inside one priority class.
 */

import {
  resolveActionPriority,
  type ActionPriorityTable,
} from '@/utils/actionPriorityTable';
import {
  worstActionPriority,
  type ActionPriority,
  type RiskDimension,
} from '@/utils/riskDimensions';

export interface PfmeaControlLike {
  control_type: string;
  cause_id?: string | null;
  detection_score?: number | null;
}

export interface PfmeaCauseLike {
  id: string;
  occurrence_score: number | null;
}

export interface PfmeaEffectLike {
  severity_score: number | null;
}

export interface PfmeaFailureModeLike {
  id: string;
  operation_step_id: string;
  severity_score: number | null;
  pfmea_potential_effects: PfmeaEffectLike[];
  pfmea_potential_causes: PfmeaCauseLike[];
  pfmea_controls: PfmeaControlLike[];
}

/**
 * Highest authored severity across the failure mode's effects, falling back to the failure
 * mode's own severity column only when no effects are listed at all. Null when neither has
 * been authored.
 */
export function maxPfmeaSeverityForFailureMode(fm: PfmeaFailureModeLike): number | null {
  const effectScores = (fm.pfmea_potential_effects ?? [])
    .map((e) => e.severity_score)
    .filter((score): score is number => score != null);
  if (effectScores.length > 0) return Math.max(...effectScores);
  if ((fm.pfmea_potential_effects ?? []).length > 0) return null;
  return fm.severity_score ?? null;
}

/**
 * Best (lowest) detection score among the failure mode's detection controls. Null when there
 * are no detection controls, or when any of them is unscored: a partially scored set cannot
 * honestly claim a best.
 */
export function minPfmeaDetectionScoreForFailureMode(fm: PfmeaFailureModeLike): number | null {
  const detection = (fm.pfmea_controls ?? []).filter((c) => c.control_type === 'detection');
  if (detection.length === 0) return null;
  if (detection.some((c) => c.detection_score == null)) return null;
  return Math.min(...detection.map((c) => c.detection_score as number));
}

/** One grid line: a failure mode paired with one of its causes, or the bare failure mode. */
export interface PfmeaLine {
  failureMode: PfmeaFailureModeLike;
  cause: PfmeaCauseLike | null;
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
}

export function pfmeaLinesForFailureMode(fm: PfmeaFailureModeLike): PfmeaLine[] {
  const severity = maxPfmeaSeverityForFailureMode(fm);
  const detection = minPfmeaDetectionScoreForFailureMode(fm);
  const causes = fm.pfmea_potential_causes ?? [];

  if (causes.length === 0) {
    return [{ failureMode: fm, cause: null, severity, occurrence: null, detection }];
  }
  return causes.map((cause) => ({
    failureMode: fm,
    cause,
    severity,
    occurrence: cause.occurrence_score ?? null,
    detection,
  }));
}

export function isLineScored(
  line: Pick<PfmeaLine, 'severity' | 'occurrence' | 'detection'>
): line is { severity: number; occurrence: number; detection: number } & PfmeaLine {
  return line.severity != null && line.occurrence != null && line.detection != null;
}

/**
 * Risk priority number for one line, or null when the line is not fully scored.
 * Ordering aid only. Never a priority driver.
 */
export function calculateRPN(fm: PfmeaFailureModeLike, cause: PfmeaCauseLike | null): number | null {
  const severity = maxPfmeaSeverityForFailureMode(fm);
  const occurrence = cause?.occurrence_score ?? null;
  const detection = minPfmeaDetectionScoreForFailureMode(fm);
  if (severity == null || occurrence == null || detection == null) return null;
  return Math.round(severity * occurrence * detection);
}

export function lineRPN(line: PfmeaLine): number | null {
  if (!isLineScored(line)) return null;
  return Math.round(line.severity * line.occurrence * line.detection);
}

export function lineActionPriority(
  line: PfmeaLine,
  table: ActionPriorityTable,
  dimension: RiskDimension
): ActionPriority | null {
  if (!isLineScored(line)) return null;
  return resolveActionPriority(table, dimension, line.severity, line.occurrence, line.detection);
}

/**
 * The failure mode's priority is the worst of its lines, because a single frequent cause is
 * enough to require action. Averaging occurrence across causes, as the previous
 * implementation did, let rare causes dilute a frequent one out of the action list.
 *
 * Null when no line is fully scored.
 */
export function calculateActionPriority(
  fm: PfmeaFailureModeLike,
  table: ActionPriorityTable,
  dimension: RiskDimension
): ActionPriority | null {
  const priorities = pfmeaLinesForFailureMode(fm)
    .map((line) => lineActionPriority(line, table, dimension))
    .filter((ap): ap is ActionPriority => ap != null);
  return worstActionPriority(priorities);
}

/** Highest RPN across the failure mode's scored lines, or null when none are scored. */
export function maxRpnForFailureMode(fm: PfmeaFailureModeLike): number | null {
  const values = pfmeaLinesForFailureMode(fm)
    .map(lineRPN)
    .filter((rpn): rpn is number => rpn != null);
  return values.length > 0 ? Math.max(...values) : null;
}

/**
 * Where the failure mode's controls sit on the prevention/detection split.
 *
 * First-pass success needs a prevention control scoped to the cause. A failure mode whose
 * only controls are detection type plans to catch the defect after producing it, which for a
 * DIYer is rework, not success. pfmea_controls already carries control_type and the cause
 * link, so this is a read rather than new data.
 */
export interface PreventionCoverage {
  hasPreventionControl: boolean;
  hasDetectionControl: boolean;
  /** Causes with no prevention control scoped to them. */
  causeIdsWithoutPrevention: string[];
  /** Controls exist, but every one of them only catches the failure after the fact. */
  isDetectionOnly: boolean;
  /** Nothing is authored either way. */
  hasNoControls: boolean;
}

export function preventionCoverageForFailureMode(fm: PfmeaFailureModeLike): PreventionCoverage {
  const controls = fm.pfmea_controls ?? [];
  const prevention = controls.filter((c) => c.control_type === 'prevention');
  const detection = controls.filter((c) => c.control_type === 'detection');
  const preventionCauseIds = new Set(
    prevention.map((c) => c.cause_id).filter((id): id is string => typeof id === 'string')
  );

  return {
    hasPreventionControl: prevention.length > 0,
    hasDetectionControl: detection.length > 0,
    causeIdsWithoutPrevention: (fm.pfmea_potential_causes ?? [])
      .filter((cause) => !preventionCauseIds.has(cause.id))
      .map((cause) => cause.id),
    isDetectionOnly: prevention.length === 0 && detection.length > 0,
    hasNoControls: controls.length === 0,
  };
}

/** True when the failure mode has no prevention control the user could act on. */
export function hasPreventionControlGap(fm: PfmeaFailureModeLike): boolean {
  const coverage = preventionCoverageForFailureMode(fm);
  return coverage.hasNoControls || coverage.isDetectionOnly || coverage.causeIdsWithoutPrevention.length > 0;
}

export interface PfmeaAggregateMetrics {
  /** Null when no line in the set is fully scored. */
  maxRpn: number | null;
  lineCount: number;
  /** Lines missing at least one of severity, occurrence, or detection. */
  unscoredLineCount: number;
  uniqueRpnCount: number;
  high: number;
  medium: number;
  low: number;
  /** Failure modes with no scored line at all. */
  unscoredFailureModeCount: number;
  failureModeCount: number;
  /** Failure modes with no prevention control to act on. */
  preventionGapCount: number;
}

export function aggregatePfmeaMetrics(
  failureModes: PfmeaFailureModeLike[],
  table: ActionPriorityTable,
  dimension: RiskDimension = 'quality'
): PfmeaAggregateMetrics {
  const rpnValues = new Set<number>();
  let maxRpn: number | null = null;
  let lineCount = 0;
  let unscoredLineCount = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let unscoredFailureModeCount = 0;
  let preventionGapCount = 0;

  for (const fm of failureModes) {
    const ap = calculateActionPriority(fm, table, dimension);
    if (ap === 'H') high += 1;
    else if (ap === 'M') medium += 1;
    else if (ap === 'L') low += 1;
    else unscoredFailureModeCount += 1;

    if (hasPreventionControlGap(fm)) preventionGapCount += 1;

    for (const line of pfmeaLinesForFailureMode(fm)) {
      lineCount += 1;
      const rpn = lineRPN(line);
      if (rpn == null) {
        unscoredLineCount += 1;
        continue;
      }
      rpnValues.add(rpn);
      maxRpn = maxRpn == null ? rpn : Math.max(maxRpn, rpn);
    }
  }

  return {
    maxRpn,
    lineCount,
    unscoredLineCount,
    uniqueRpnCount: rpnValues.size,
    high,
    medium,
    low,
    unscoredFailureModeCount,
    failureModeCount: failureModes.length,
    preventionGapCount,
  };
}
