/**
 * Scoring for the parallel register that owns safety, schedule, and budget risk.
 *
 * These risks go through the same Action Priority table as PFMEA quality lines, so a safety
 * risk and a quality failure mode are ranked by one method. A row that has not been classified
 * into a component, or has not been scored, has no priority: that is reported, not filled in.
 */

import {
  resolveActionPriority,
  type ActionPriorityTable,
} from '@/utils/actionPriorityTable';
import type { ActionPriority, RegisterRiskDimension } from '@/utils/riskDimensions';

export interface RegisterRiskScores {
  riskDimension: RegisterRiskDimension | null;
  severityScore: number | null;
  occurrenceScore: number | null;
  detectionScore: number | null;
}

export interface RegisterRiskPriority {
  actionPriority: ActionPriority | null;
  /** Tie-break ordering inside a priority class only. */
  rpn: number | null;
  /** Why there is no priority, for the authoring UI to show. */
  unscoredReason: 'unclassified' | 'missing_scores' | null;
}

export function registerRiskPriority(
  scores: RegisterRiskScores,
  table: ActionPriorityTable | null
): RegisterRiskPriority {
  const { riskDimension, severityScore, occurrenceScore, detectionScore } = scores;

  if (riskDimension == null) {
    return { actionPriority: null, rpn: null, unscoredReason: 'unclassified' };
  }
  if (severityScore == null || occurrenceScore == null || detectionScore == null) {
    return { actionPriority: null, rpn: null, unscoredReason: 'missing_scores' };
  }

  const rpn = Math.round(severityScore * occurrenceScore * detectionScore);

  if (!table) {
    // The scores are complete but the table has not loaded. RPN is arithmetic and safe to
    // return; priority is not, so it stays null.
    return { actionPriority: null, rpn, unscoredReason: null };
  }

  return {
    actionPriority: resolveActionPriority(
      table,
      riskDimension,
      severityScore,
      occurrenceScore,
      detectionScore
    ),
    rpn,
    unscoredReason: null,
  };
}

export const REGISTER_RISK_UNSCORED_MESSAGE: Record<
  NonNullable<RegisterRiskPriority['unscoredReason']>,
  string
> = {
  unclassified: 'Pick a component before this risk can be prioritized.',
  missing_scores: 'Set all three scores before this risk can be prioritized.',
};
