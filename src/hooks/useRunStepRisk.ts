import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  isActionPriority,
  isRiskDimension,
  worstActionPriority,
  type ActionPriority,
  type RiskDimension,
} from '@/utils/riskDimensions';

export interface StepRiskItem {
  id: string;
  title: string;
  description: string | null;
  dimension: RiskDimension;
  actionPriority: ActionPriority | null;
  rpn: number | null;
}

export interface StepRiskSummary {
  /** Worst priority among the step's applied risks, or null when none are scored. */
  worstActionPriority: ActionPriority | null;
  /** Ordered worst first, then by RPN, so the first entry is the one to read. */
  items: StepRiskItem[];
  highCount: number;
}

export interface RunStepRiskState {
  byStepId: Map<string, StepRiskSummary>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function compareItems(a: StepRiskItem, b: StepRiskItem): number {
  const rank = (ap: ActionPriority | null): number =>
    ap === 'H' ? 3 : ap === 'M' ? 2 : ap === 'L' ? 1 : 0;
  const byPriority = rank(b.actionPriority) - rank(a.actionPriority);
  if (byPriority !== 0) return byPriority;
  return (b.rpn ?? 0) - (a.rpn ?? 0);
}

/**
 * The applied risk that belongs to each step of a run.
 *
 * This is the read side of the Stage 3 list: the analysis was translated into plain language
 * when it was written, so the execution UI shows it without touching a `pfmea_*` table.
 */
export function useRunStepRisk(projectRunId: string | null | undefined): RunStepRiskState {
  const [byStepId, setByStepId] = useState<Map<string, StepRiskSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (!projectRunId) {
      setByStepId(new Map());
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const { data, error: loadError } = await supabase
        .from('project_run_risks')
        .select(
          'id, risk_title, risk_description, risk_dimension, action_priority, rpn, operation_step_id, excluded_by_customization, hidden_from_register'
        )
        .eq('project_run_id', projectRunId)
        .not('operation_step_id', 'is', null);

      if (cancelled) return;

      if (loadError) {
        console.error('Step risk load failed:', loadError);
        setError(loadError.message);
        setByStepId(new Map());
        setLoading(false);
        return;
      }

      const grouped = new Map<string, StepRiskItem[]>();
      for (const row of data ?? []) {
        if (!row.operation_step_id) continue;
        if (row.excluded_by_customization === true || row.hidden_from_register === true) continue;
        if (!isRiskDimension(row.risk_dimension)) continue;

        const item: StepRiskItem = {
          id: row.id,
          title: row.risk_title,
          description: row.risk_description,
          dimension: row.risk_dimension,
          actionPriority: isActionPriority(row.action_priority) ? row.action_priority : null,
          rpn: row.rpn,
        };
        const list = grouped.get(row.operation_step_id);
        if (list) {
          list.push(item);
        } else {
          grouped.set(row.operation_step_id, [item]);
        }
      }

      const summaries = new Map<string, StepRiskSummary>();
      for (const [stepId, items] of grouped) {
        items.sort(compareItems);
        summaries.set(stepId, {
          worstActionPriority: worstActionPriority(
            items
              .map((item) => item.actionPriority)
              .filter((ap): ap is ActionPriority => ap !== null)
          ),
          items,
          highCount: items.filter((item) => item.actionPriority === 'H').length,
        });
      }

      setByStepId(summaries);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectRunId, reloadToken]);

  return { byStepId, loading, error, reload };
}
