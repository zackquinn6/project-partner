/**
 * Everything the Risk Dashboard reads for one run: the applied risk list, and the authored
 * rubric that says what each 1-10 score means.
 *
 * The dashboard is its own window, so it cannot borrow the register's in-memory rows. Nothing
 * here substitutes a score, a priority, or a meaning that the data does not carry: a line
 * nobody scored is reported as unscored, and a rubric row that was never seeded is reported
 * as missing rather than described with stand-in text.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { isActionPriority, isRiskDimension, type ActionPriority, type RiskDimension } from '@/utils/riskDimensions';

type RunRiskRow = Database['public']['Tables']['project_run_risks']['Row'];
type PfmeaScoringRow = Database['public']['Tables']['pfmea_scoring']['Row'];

export type ScoreCriterion = 'severity' | 'occurrence' | 'detection';

export interface DashboardRisk {
  id: string;
  title: string;
  description: string | null;
  dimension: RiskDimension | null;
  actionPriority: ActionPriority | null;
  rpn: number | null;
  severityScore: number | null;
  occurrenceScore: number | null;
  detectionScore: number | null;
  scheduleImpactLowDays: number | null;
  scheduleImpactHighDays: number | null;
  budgetImpactLow: number | null;
  budgetImpactHigh: number | null;
  status: string | null;
  source: string | null;
  /** Failure mode id for PFMEA lines, template risk id for register lines. */
  sourceTemplateId: string | null;
  mitigationStrategy: string | null;
  mitigationEffortLevel: string | null;
  mitigationActions: { action: string; benefit: string | null; completed: boolean }[];
  excludedByCustomization: boolean;
  hiddenFromRegister: boolean;
}

/** One authored rubric row: the meaning of a single score for one component and criterion. */
export interface ScoreMeaning {
  score: number;
  /** Labelled lines of authored text. Only fields the admin filled in are present. */
  lines: { label: string; text: string }[];
}

export interface RunRiskDashboardData {
  risks: DashboardRisk[];
  /** Null when no rubric row exists for that component, criterion, and score. */
  scoreMeaning: (
    dimension: RiskDimension,
    criterion: ScoreCriterion,
    score: number
  ) => ScoreMeaning | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function parseMitigationActions(raw: unknown): DashboardRisk['mitigationActions'] {
  if (!Array.isArray(raw)) return [];
  const parsed: DashboardRisk['mitigationActions'] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.action !== 'string' || o.action.trim().length === 0) continue;
    parsed.push({
      action: o.action,
      benefit: typeof o.benefit === 'string' ? o.benefit : null,
      completed: o.completed === true,
    });
  }
  return parsed;
}

function toDashboardRisk(row: RunRiskRow): DashboardRisk {
  return {
    id: row.id,
    title: row.risk_title,
    description: row.risk_description,
    dimension: isRiskDimension(row.risk_dimension) ? row.risk_dimension : null,
    actionPriority: isActionPriority(row.action_priority) ? row.action_priority : null,
    rpn: row.rpn,
    severityScore: row.severity_score,
    occurrenceScore: row.occurrence_score,
    detectionScore: row.detection_score,
    scheduleImpactLowDays: row.schedule_impact_low_days,
    scheduleImpactHighDays: row.schedule_impact_high_days,
    budgetImpactLow: row.budget_impact_low,
    budgetImpactHigh: row.budget_impact_high,
    status: row.status,
    source: row.source,
    sourceTemplateId: row.source_template_id,
    mitigationStrategy: row.mitigation_strategy,
    mitigationEffortLevel: row.mitigation_effort_level,
    mitigationActions: parseMitigationActions(row.mitigation_actions),
    excludedByCustomization: row.excluded_by_customization,
    hiddenFromRegister: row.hidden_from_register,
  };
}

const CRITERION_FIELDS: Record<ScoreCriterion, { label: string; field: keyof PfmeaScoringRow }[]> = {
  severity: [
    { label: 'What it does to the work', field: 'quality_effects' },
    { label: 'What it does to the process', field: 'process_effects' },
    { label: 'Examples', field: 'quality_examples' },
  ],
  occurrence: [
    { label: 'How often', field: 'occurrence_frequency_scale' },
    { label: 'Over what span', field: 'occurrence_time_scale' },
    { label: 'Scoring note', field: 'typical_occurrence_note' },
  ],
  detection: [
    { label: 'Catching the failure', field: 'failure_mode_detection' },
    { label: 'Catching the cause', field: 'cause_detection' },
    { label: 'Scoring note', field: 'typical_detection_note' },
  ],
};

function scoreMeaningKey(dimension: string, criterion: string, score: number): string {
  return `${dimension}:${criterion}:${score}`;
}

function toScoreMeaning(row: PfmeaScoringRow, criterion: ScoreCriterion): ScoreMeaning {
  const lines: ScoreMeaning['lines'] = [];
  for (const { label, field } of CRITERION_FIELDS[criterion]) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      lines.push({ label, text: value });
    }
  }
  return { score: row.score, lines };
}

function isScoreCriterion(value: string): value is ScoreCriterion {
  return value === 'severity' || value === 'occurrence' || value === 'detection';
}

/**
 * Loads the run's risks and the scoring rubric together, and refetches when the register
 * writes, so opening the dashboard beside Risk Radar does not show a stale reading.
 */
export function useRunRiskDashboard(
  projectRunId: string | undefined,
  enabled: boolean
): RunRiskDashboardData {
  const [risks, setRisks] = useState<DashboardRisk[]>([]);
  const [criteria, setCriteria] = useState<Map<string, ScoreMeaning>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectRunId) {
      setRisks([]);
      setCriteria(new Map());
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [risksResult, scoringResult] = await Promise.all([
        supabase
          .from('project_run_risks')
          .select('*')
          .eq('project_run_id', projectRunId)
          .order('display_order', { ascending: true }),
        supabase.from('pfmea_scoring').select('*'),
      ]);

      if (risksResult.error) throw risksResult.error;
      if (scoringResult.error) throw scoringResult.error;

      setRisks((risksResult.data ?? []).map(toDashboardRisk));

      const index = new Map<string, ScoreMeaning>();
      for (const row of scoringResult.data ?? []) {
        if (!isScoreCriterion(row.criterion_type)) continue;
        index.set(
          scoreMeaningKey(row.dimension, row.criterion_type, row.score),
          toScoreMeaning(row, row.criterion_type)
        );
      }
      setCriteria(index);
    } catch (err) {
      console.error('Risk dashboard load failed:', err);
      setRisks([]);
      setCriteria(new Map());
      setError(err instanceof Error ? err.message : 'Failed to load the risk dashboard');
    } finally {
      setLoading(false);
    }
  }, [projectRunId]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    const onRisksUpdated = () => {
      void load();
    };
    window.addEventListener('risks-updated', onRisksUpdated);
    return () => window.removeEventListener('risks-updated', onRisksUpdated);
  }, [enabled, load]);

  const scoreMeaning = useCallback(
    (dimension: RiskDimension, criterion: ScoreCriterion, score: number) =>
      criteria.get(scoreMeaningKey(dimension, criterion, score)) ?? null,
    [criteria]
  );

  return useMemo(
    () => ({ risks, scoreMeaning, loading, error, reload: load }),
    [risks, scoreMeaning, loading, error, load]
  );
}
