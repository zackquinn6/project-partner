/**
 * What actually went wrong, per template step, against what the analysis said would.
 *
 * This closes the loop. Reports users file through the "something went wrong" flow become
 * `rework_events` and `stuck_events`; here they are aggregated per step and per component and
 * compared to the authored occurrence, so an author can see where the template's own numbers
 * disagree with reality.
 *
 * No threshold table converts a report rate into an occurrence score, because one does not
 * exist as data. What is reported instead is the contradiction a reader can act on without
 * one: something happened on a step whose analysis says it essentially never happens, or
 * happened on a step nobody scored.
 */

import { supabase } from '@/integrations/supabase/client';
import { isTriageType, riskDimensionForTriageType } from '@/utils/reworkEngine';
import { RISK_DIMENSIONS, type RiskDimension } from '@/utils/riskDimensions';

export interface StepEvidenceCounts {
  operationStepId: string;
  stepTitle: string | null;
  /** Reported problems on this step, split by the component they count against. */
  reworkByDimension: Record<RiskDimension, number>;
  reworkTotal: number;
  /** Times a user stalled on this step. */
  stallCount: number;
  /** Distinct users who reported something here. */
  reporterCount: number;
}

export interface StepOccurrenceComparison extends StepEvidenceCounts {
  /**
   * Lowest occurrence authored on this step's quality failure modes, or null when none of them
   * has been scored. The lowest is the claim being tested: if the most optimistic line on the
   * step says "does not happen" and it happened, that line is wrong.
   */
  authoredMinOccurrence: number | null;
  /** Failure modes on this step whose occurrence has not been scored at all. */
  unscoredFailureModeCount: number;
  /** The template claims the lowest possible occurrence, but the step has reports. */
  contradictsAuthoredOccurrence: boolean;
  /** The step has reports and no authored occurrence to compare them to. */
  reportedButUnscored: boolean;
}

function emptyDimensionCounts(): Record<RiskDimension, number> {
  const counts = {} as Record<RiskDimension, number>;
  for (const dimension of RISK_DIMENSIONS) counts[dimension] = 0;
  return counts;
}

/** The occurrence score that claims a failure does not realistically happen. */
const OCCURRENCE_CLAIMS_NEVER = 1;

/**
 * Evidence for one template, keyed by operation step id.
 *
 * Scoped by `template_project_id` so a report filed on a different template does not colour
 * this one's numbers, even when the step titles look similar.
 */
export async function loadStepRiskEvidence(
  templateProjectId: string
): Promise<Map<string, StepOccurrenceComparison>> {
  const [reworkResult, stuckResult, failureModeResult] = await Promise.all([
    supabase
      .from('rework_events')
      .select('step_id, step_title, triage_type, user_id')
      .eq('template_project_id', templateProjectId),
    supabase
      .from('stuck_events')
      .select('step_id, step_title, user_id')
      .eq('template_project_id', templateProjectId),
    supabase
      .from('pfmea_failure_modes')
      .select('operation_step_id, pfmea_potential_causes(occurrence_score)')
      .eq('project_id', templateProjectId),
  ]);

  for (const [label, result] of [
    ['rework_events', reworkResult],
    ['stuck_events', stuckResult],
    ['pfmea_failure_modes', failureModeResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Risk evidence could not read ${label}: ${result.error.message}`);
    }
  }

  const evidence = new Map<string, StepEvidenceCounts & { reporters: Set<string> }>();

  const ensure = (stepId: string, stepTitle: string | null) => {
    const existing = evidence.get(stepId);
    if (existing) {
      if (existing.stepTitle === null && stepTitle !== null) existing.stepTitle = stepTitle;
      return existing;
    }
    const created = {
      operationStepId: stepId,
      stepTitle,
      reworkByDimension: emptyDimensionCounts(),
      reworkTotal: 0,
      stallCount: 0,
      reporterCount: 0,
      reporters: new Set<string>(),
    };
    evidence.set(stepId, created);
    return created;
  };

  for (const row of reworkResult.data ?? []) {
    if (!row.step_id) continue;
    const entry = ensure(row.step_id, row.step_title ?? null);
    entry.reworkTotal += 1;
    entry.reporters.add(row.user_id);
    if (isTriageType(row.triage_type)) {
      entry.reworkByDimension[riskDimensionForTriageType(row.triage_type)] += 1;
    }
  }

  for (const row of stuckResult.data ?? []) {
    if (!row.step_id) continue;
    const entry = ensure(row.step_id, row.step_title ?? null);
    entry.stallCount += 1;
    entry.reporters.add(row.user_id);
  }

  const authoredByStep = new Map<string, { minOccurrence: number | null; unscored: number }>();
  for (const fm of failureModeResult.data ?? []) {
    const scored = (fm.pfmea_potential_causes ?? [])
      .map((cause) => cause.occurrence_score)
      .filter((score): score is number => score != null);

    const current = authoredByStep.get(fm.operation_step_id) ?? {
      minOccurrence: null,
      unscored: 0,
    };
    if (scored.length === 0) {
      current.unscored += 1;
    } else {
      const min = Math.min(...scored);
      current.minOccurrence =
        current.minOccurrence === null ? min : Math.min(current.minOccurrence, min);
    }
    authoredByStep.set(fm.operation_step_id, current);
  }

  const comparisons = new Map<string, StepOccurrenceComparison>();
  for (const [stepId, entry] of evidence) {
    const authored = authoredByStep.get(stepId);
    const authoredMinOccurrence = authored?.minOccurrence ?? null;
    const hasReports = entry.reworkTotal > 0 || entry.stallCount > 0;

    comparisons.set(stepId, {
      operationStepId: entry.operationStepId,
      stepTitle: entry.stepTitle,
      reworkByDimension: entry.reworkByDimension,
      reworkTotal: entry.reworkTotal,
      stallCount: entry.stallCount,
      reporterCount: entry.reporters.size,
      authoredMinOccurrence,
      unscoredFailureModeCount: authored?.unscored ?? 0,
      contradictsAuthoredOccurrence:
        hasReports && authoredMinOccurrence === OCCURRENCE_CLAIMS_NEVER,
      reportedButUnscored: hasReports && authoredMinOccurrence === null,
    });
  }

  return comparisons;
}

/** The steps an author should look at first: reality disagrees with the analysis there. */
export function stepsNeedingOccurrenceReview(
  evidence: Map<string, StepOccurrenceComparison>
): StepOccurrenceComparison[] {
  return Array.from(evidence.values())
    .filter((step) => step.contradictsAuthoredOccurrence || step.reportedButUnscored)
    .sort((a, b) => b.reworkTotal + b.stallCount - (a.reworkTotal + a.stallCount));
}
