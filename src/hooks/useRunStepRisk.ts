import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  isActionPriority,
  isRiskDimension,
  worstActionPriority,
  type ActionPriority,
  type RiskDimension,
} from '@/utils/riskDimensions';
import { fetchProjectRunKeyCharacteristics } from '@/utils/applyProjectRiskLogic';
import type { KeyCharacteristicRow } from '@/utils/keyCharacteristics';
import { useAuth } from '@/contexts/AuthContext';
import { reportUserFacingError } from '@/utils/errorReporting';

export interface StepRiskItem {
  id: string;
  title: string;
  description: string | null;
  dimension: RiskDimension;
  actionPriority: ActionPriority | null;
  rpn: number | null;
  /**
   * The items this risk puts on the Key Characteristic register. Empty means the risk is real
   * but attention is not the lever: either the process decides it or a control already makes
   * the error impossible.
   */
  keyCharacteristics: KeyCharacteristicRow[];
}

export interface StepRiskSummary {
  /** Worst priority among the step's applied risks, or null when none are scored. */
  worstActionPriority: ActionPriority | null;
  /** Ordered worst first, then by RPN, so the first entry is the one to read. */
  items: StepRiskItem[];
  highCount: number;
  /** The step's Key Characteristics, across all of its risks. */
  keyCharacteristics: KeyCharacteristicRow[];
}

export interface RunStepRiskState {
  byStepId: Map<string, StepRiskSummary>;
  loading: boolean;
  /** Plain-language sentence with a support code; the raw failure stays out of the workflow UI. */
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
  const { user } = useAuth();
  const [byStepId, setByStepId] = useState<Map<string, StepRiskSummary>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

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
        const supportCode = await reportUserFacingError({
          source: 'risk_radar',
          operation: 'load_step_risks',
          userId: userIdRef.current,
          projectRunId,
          error: loadError,
          userMessage: 'Step risk priorities could not be loaded.',
          notificationTitle: 'Step risk priorities did not load',
          toastPresenter: 'none',
        });
        if (cancelled) return;
        setError(`Step risk priorities could not be loaded. Error code: ${supportCode}`);
        setByStepId(new Map());
        setLoading(false);
        return;
      }

      let keyCharacteristics: KeyCharacteristicRow[];
      try {
        keyCharacteristics = await fetchProjectRunKeyCharacteristics(projectRunId);
      } catch (err) {
        if (cancelled) return;
        const supportCode = await reportUserFacingError({
          source: 'risk_radar',
          operation: 'load_step_key_characteristics',
          userId: userIdRef.current,
          projectRunId,
          error: err,
          userMessage: 'Step risk priorities could not be loaded.',
          notificationTitle: 'Step risk priorities did not load',
          toastPresenter: 'none',
        });
        if (cancelled) return;
        setError(`Step risk priorities could not be loaded. Error code: ${supportCode}`);
        setByStepId(new Map());
        setLoading(false);
        return;
      }
      if (cancelled) return;

      const kcByRiskId = new Map<string, KeyCharacteristicRow[]>();
      for (const kc of keyCharacteristics) {
        const list = kcByRiskId.get(kc.projectRunRiskId);
        if (list) list.push(kc);
        else kcByRiskId.set(kc.projectRunRiskId, [kc]);
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
          keyCharacteristics: kcByRiskId.get(row.id) ?? [],
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
          keyCharacteristics: items.flatMap((item) => item.keyCharacteristics),
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
