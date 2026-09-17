/**
 * Risk Dashboard: one sector per risk component, and a drill-down on any line.
 *
 * Four readings rather than one blended number, because a run can be safe and still be late.
 * Every number on screen is either stored or arithmetic on stored scores - there are no
 * modelled chances here, and an unscored line is shown as unscored rather than as a low one.
 *
 * Wording follows the risk frame for status ("2 items can still hurt the result") and the gain
 * frame for mitigation ("closing this removes..."), since a loss frame on the choice itself
 * pushes people toward gambling rather than toward closing the item out.
 */

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crosshair, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { reportUserFacingError } from '@/utils/errorReporting';
import {
  PLANNING_TOOL_WINDOW_HEADER_CLASSNAME,
  PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME,
  PLANNING_TOOL_WINDOW_TITLE_CLASSNAME,
} from '@/components/PlanningWizardSteps/planningToolWindowChrome';
import { useActionPriorityTable } from '@/hooks/useActionPriorityTable';
import { actionPriorityLabel, type ActionPriorityTable } from '@/utils/actionPriorityTable';
import { useRunRiskDashboard, type DashboardRisk, type ScoreCriterion } from '@/hooks/useRunRiskDashboard';
import {
  RISK_COMPONENT_CONSUMER_LABELS,
  RISK_COMPONENT_CONSUMER_STAKES,
  compareByRiskPriority,
  rollupRiskComponents,
  worstRpnByComponent,
  type RiskComponentRollup,
} from '@/utils/riskProfileRollup';
import { RISK_DIMENSIONS, type ActionPriority, type RiskDimension } from '@/utils/riskDimensions';

/** How many lines each sector lists before the rest are left to the register. */
const TOP_ITEM_LIMIT = 5;

function lightClass(ap: ActionPriority | null): string {
  switch (ap) {
    case 'H':
      return 'bg-destructive-soft ring-destructive-soft';
    case 'M':
      return 'bg-warning-soft ring-warning-soft';
    case 'L':
      return 'bg-success ring-success';
    default:
      return 'bg-muted-foreground/40 ring-muted-foreground/15';
  }
}

function sectorClass(ap: ActionPriority | null): string {
  switch (ap) {
    case 'H':
      return 'border-destructive-soft/40';
    case 'M':
      return 'border-warning-soft/40';
    case 'L':
      return 'border-success/40';
    default:
      return 'border-border';
  }
}

function formatDollars(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatDays(value: number): string {
  return `${value} day${value === 1 ? '' : 's'}`;
}

/** Rows a component counts: classified, not excluded by a rule, not hidden by the user. */
function componentRisks(risks: DashboardRisk[], dimension: RiskDimension): DashboardRisk[] {
  return risks.filter(
    (risk) =>
      risk.dimension === dimension && !risk.excludedByCustomization && !risk.hiddenFromRegister
  );
}

function rangeText(
  low: number | null,
  high: number | null,
  format: (value: number) => string
): string | null {
  if (low == null && high == null) return null;
  if (low != null && high != null) {
    return low === high ? format(low) : `${format(low)} to ${format(high)}`;
  }
  return format((low ?? high) as number);
}

/**
 * Summed exposure for the component, over the same rows the counts cover.
 *
 * Schedule and budget impact are authored on register lines; PFMEA quality lines carry the
 * severity rubric instead, so those components report their severity reading rather than a
 * day or dollar figure that was never entered.
 */
function impactSummary(
  risks: DashboardRisk[],
  dimension: RiskDimension
): { text: string; detail: string } | null {
  if (dimension === 'schedule') {
    const withImpact = risks.filter(
      (r) => r.scheduleImpactLowDays != null || r.scheduleImpactHighDays != null
    );
    if (withImpact.length === 0) return null;
    const low = withImpact.reduce((sum, r) => sum + (r.scheduleImpactLowDays ?? 0), 0);
    const high = withImpact.reduce((sum, r) => sum + (r.scheduleImpactHighDays ?? 0), 0);
    const text = rangeText(low, high, formatDays);
    if (!text) return null;
    return {
      text: `${text} at risk`,
      detail: `across ${withImpact.length} item${withImpact.length === 1 ? '' : 's'} with a schedule impact`,
    };
  }

  if (dimension === 'budget') {
    const withImpact = risks.filter((r) => r.budgetImpactLow != null || r.budgetImpactHigh != null);
    if (withImpact.length === 0) return null;
    const low = withImpact.reduce((sum, r) => sum + (r.budgetImpactLow ?? 0), 0);
    const high = withImpact.reduce((sum, r) => sum + (r.budgetImpactHigh ?? 0), 0);
    const text = rangeText(low, high, formatDollars);
    if (!text) return null;
    return {
      text: `${text} at risk`,
      detail: `across ${withImpact.length} item${withImpact.length === 1 ? '' : 's'} with a cost impact`,
    };
  }

  return null;
}

const CRITERION_LABELS: Record<ScoreCriterion, string> = {
  severity: 'Severity',
  occurrence: 'Occurrence',
  detection: 'Detection',
};

function ScoreRow({
  criterion,
  score,
  meaning,
}: {
  criterion: ScoreCriterion;
  score: number | null;
  meaning: { lines: { label: string; text: string }[] } | null;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {CRITERION_LABELS[criterion]}
        </span>
        <span className="text-sm font-bold tabular-nums">{score != null ? `${score} / 10` : 'Not set'}</span>
      </div>
      {score == null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          This score has not been set, so the line has no priority yet.
        </p>
      ) : meaning && meaning.lines.length > 0 ? (
        <dl className="mt-1.5 space-y-1">
          {meaning.lines.map((line) => (
            <div key={line.label}>
              <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {line.label}
              </dt>
              <dd className="text-xs leading-snug">{line.text}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          No rubric has been seeded for this component at score {score}.
        </p>
      )}
    </div>
  );
}

interface PfmeaActionItem {
  id: string;
  recommended_action: string;
  responsible_person: string | null;
  status: string;
  target_completion_date: string | null;
}

/** Mitigation work for a PFMEA line, which keeps its actions in pfmea_action_items. */
function PfmeaActions({ failureModeId }: { failureModeId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<PfmeaActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void supabase
      .from('pfmea_action_items')
      .select('id, recommended_action, responsible_person, status, target_completion_date')
      .eq('failure_mode_id', failureModeId)
      .then(async ({ data, error: queryError }) => {
        if (!active) return;
        setLoading(false);
        if (queryError) {
          setItems([]);
          const supportCode = await reportUserFacingError({
            source: 'risk_dashboard',
            operation: 'load_risk_actions',
            userId: user?.id,
            error: queryError,
            userMessage: 'Risk actions could not be loaded.',
            notificationTitle: 'Risk actions did not load',
            toastPresenter: 'none',
          });
          if (!active) return;
          setError(`Risk actions could not be loaded. Error code: ${supportCode}`);
          return;
        }
        setItems(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [failureModeId, user?.id]);

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Loading actions
      </p>
    );
  }
  if (error) return <p className="text-xs text-destructive">{error}</p>;
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No action has been recorded for this line.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border px-3 py-2">
          <p className="text-xs leading-snug">{item.recommended_action}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>{item.status}</span>
            {item.responsible_person ? <span>Owner: {item.responsible_person}</span> : null}
            {item.target_completion_date ? <span>Due: {item.target_completion_date.slice(0, 10)}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Mitigation work for a register line, which keeps its actions on the risk row. */
function RegisterActions({ risk }: { risk: DashboardRisk }) {
  const open = risk.mitigationActions.filter((a) => !a.completed);
  const done = risk.mitigationActions.length - open.length;

  return (
    <div className="space-y-2">
      {risk.mitigationStrategy ? (
        <p className="text-xs leading-snug">{risk.mitigationStrategy}</p>
      ) : null}
      {risk.mitigationActions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No mitigation has been written for this line yet.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {risk.mitigationActions.map((action, index) => (
              <li key={`${index}-${action.action}`} className="rounded-md border px-3 py-2">
                <p className={cn('text-xs leading-snug', action.completed && 'text-muted-foreground line-through')}>
                  {action.action}
                </p>
                {action.benefit ? (
                  <p className="mt-1 text-[11px] leading-snug text-success">
                    Closing this gets you: {action.benefit}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            {done} of {risk.mitigationActions.length} closed
            {risk.mitigationEffortLevel ? ` - ${risk.mitigationEffortLevel} effort to finish the rest` : ''}
          </p>
        </>
      )}
    </div>
  );
}

function RiskDrillDown({
  risk,
  scoreMeaning,
  table,
  tableError,
}: {
  risk: DashboardRisk;
  scoreMeaning: ReturnType<typeof useRunRiskDashboard>['scoreMeaning'];
  table: ActionPriorityTable | null;
  tableError: string | null;
}) {
  const label = risk.actionPriority && table ? actionPriorityLabel(table, risk.actionPriority) : null;
  const scheduleImpact = rangeText(
    risk.scheduleImpactLowDays,
    risk.scheduleImpactHighDays,
    formatDays
  );
  const budgetImpact = rangeText(risk.budgetImpactLow, risk.budgetImpactHigh, formatDollars);

  return (
    <div className="space-y-4">
      {risk.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{risk.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn('h-2.5 w-2.5 shrink-0 rounded-full ring-2', lightClass(risk.actionPriority))}
          aria-hidden
        />
        <span className="text-sm font-semibold">
          {label ? label.label : risk.actionPriority ? risk.actionPriority : 'Not scored'}
        </span>
        <Badge variant="outline" className="tabular-nums">
          {risk.rpn != null ? `${risk.rpn} / 1000` : 'No score'}
        </Badge>
        {risk.dimension ? (
          <Badge variant="secondary">{RISK_COMPONENT_CONSUMER_LABELS[risk.dimension]}</Badge>
        ) : null}
      </div>
      {label ? <p className="text-xs text-muted-foreground">{label.description}</p> : null}
      {tableError ? <p className="text-xs text-destructive">{tableError}</p> : null}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What drives the score
        </h3>
        {risk.dimension ? (
          <>
            <ScoreRow
              criterion="severity"
              score={risk.severityScore}
              meaning={
                risk.severityScore != null
                  ? scoreMeaning(risk.dimension, 'severity', risk.severityScore)
                  : null
              }
            />
            <ScoreRow
              criterion="occurrence"
              score={risk.occurrenceScore}
              meaning={
                risk.occurrenceScore != null
                  ? scoreMeaning(risk.dimension, 'occurrence', risk.occurrenceScore)
                  : null
              }
            />
            <ScoreRow
              criterion="detection"
              score={risk.detectionScore}
              meaning={
                risk.detectionScore != null
                  ? scoreMeaning(risk.dimension, 'detection', risk.detectionScore)
                  : null
              }
            />
            {risk.rpn != null ? (
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {risk.severityScore} x {risk.occurrenceScore} x {risk.detectionScore} = {risk.rpn}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            This line has no component, so it cannot be scored or prioritized.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Mitigation
        </h3>
        {risk.source === 'pfmea' && risk.sourceTemplateId ? (
          <PfmeaActions failureModeId={risk.sourceTemplateId} />
        ) : (
          <RegisterActions risk={risk} />
        )}
      </section>

      {scheduleImpact || budgetImpact ? (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            If it happens
          </h3>
          {scheduleImpact ? <p className="text-xs">{scheduleImpact} of delay</p> : null}
          {budgetImpact ? <p className="text-xs">{budgetImpact} of extra spend</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function ComponentSector({
  dimension,
  rows,
  rollup,
  score,
  highlighted,
  table,
  onSelectRisk,
}: {
  dimension: RiskDimension;
  /** Rows this component counts, already filtered. */
  rows: DashboardRisk[];
  rollup: RiskComponentRollup;
  /** Worst line's RPN, or null when nothing in the component is scored. */
  score: number | null;
  highlighted: boolean;
  table: ActionPriorityTable | null;
  onSelectRisk: (risk: DashboardRisk) => void;
}) {
  const topItems = useMemo(
    () =>
      [...rows]
        .sort((a, b) =>
          compareByRiskPriority(
            { action_priority: a.actionPriority, rpn: a.rpn, title: a.title },
            { action_priority: b.actionPriority, rpn: b.rpn, title: b.title }
          )
        )
        .slice(0, TOP_ITEM_LIMIT),
    [rows]
  );
  const impact = useMemo(() => impactSummary(rows, dimension), [rows, dimension]);

  const ap = rollup.worstActionPriority;
  const label = ap && table ? actionPriorityLabel(table, ap) : null;

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-lg border bg-card',
        sectorClass(ap),
        highlighted && 'ring-2 ring-ring'
      )}
    >
      <header className="border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-3 w-3 shrink-0 rounded-full ring-2', lightClass(ap))} aria-hidden />
          <h2 className="min-w-0 truncate text-sm font-bold">
            {RISK_COMPONENT_CONSUMER_LABELS[dimension]}
          </h2>
          <span className="ml-auto shrink-0 text-base font-bold tabular-nums">
            {score != null ? score : '-'}
            <span className="text-[10px] font-normal text-muted-foreground"> / 1000</span>
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {RISK_COMPONENT_CONSUMER_STAKES[dimension]}
        </p>
        <p className="mt-1 text-xs font-semibold">
          {label ? label.label : rollup.totalCount === 0 ? 'Nothing recorded' : 'Not scored'}
        </p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {rollup.highCount} act now · {rollup.mediumCount} safeguard · {rollup.lowCount} covered
          {rollup.unscoredCount > 0 ? ` · ${rollup.unscoredCount} unscored` : ''}
        </p>
        {impact ? (
          <p className="mt-1 text-[11px]">
            <span className="font-semibold">{impact.text}</span>{' '}
            <span className="text-muted-foreground">{impact.detail}</span>
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 p-2">
        {topItems.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Nothing is recorded against {RISK_COMPONENT_CONSUMER_LABELS[dimension].toLowerCase()} on
            this run.
          </p>
        ) : (
          <ul className="space-y-1">
            {topItems.map((risk) => (
              <li key={risk.id}>
                <button
                  type="button"
                  onClick={() => onSelectRisk(risk)}
                  onDoubleClick={() => onSelectRisk(risk)}
                  className="flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 shrink-0 rounded-full ring-2',
                      lightClass(risk.actionPriority)
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{risk.title}</span>
                    <span className="block text-[10px] tabular-nums text-muted-foreground">
                      {risk.severityScore != null &&
                      risk.occurrenceScore != null &&
                      risk.detectionScore != null
                        ? `S${risk.severityScore} O${risk.occurrenceScore} D${risk.detectionScore}`
                        : 'Not scored'}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {risk.rpn != null ? risk.rpn : '-'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {rows.length > topItems.length ? (
          <p className="px-2 pt-1 text-[10px] text-muted-foreground">
            {rows.length - topItems.length} more in the register
          </p>
        ) : null}
      </div>
    </section>
  );
}

export interface RiskDashboardWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectRunId?: string;
  projectDisplayName?: string | null;
  /** Component the user clicked in the Risk Radar header, highlighted on open. */
  initialDimension?: RiskDimension | null;
}

export function RiskDashboardWindow({
  open,
  onOpenChange,
  projectRunId,
  projectDisplayName,
  initialDimension,
}: RiskDashboardWindowProps) {
  const { risks, scoreMeaning, loading, error } = useRunRiskDashboard(projectRunId, open);
  const { table, error: tableError } = useActionPriorityTable();
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelectedRiskId(null);
  }, [open]);

  const sectors = useMemo(() => {
    const rollups = rollupRiskComponents(
      risks.map((risk) => ({
        risk_dimension: risk.dimension,
        action_priority: risk.actionPriority,
        excluded_by_customization: risk.excludedByCustomization,
        hidden_from_register: risk.hiddenFromRegister,
      }))
    );
    const worst = worstRpnByComponent(
      risks.map((risk) => ({
        risk_dimension: risk.dimension,
        action_priority: risk.actionPriority,
        excluded_by_customization: risk.excludedByCustomization,
        hidden_from_register: risk.hiddenFromRegister,
        rpn: risk.rpn,
      }))
    );
    return RISK_DIMENSIONS.map((dimension) => ({
      dimension,
      rows: componentRisks(risks, dimension),
      rollup: rollups[dimension],
      score: worst[dimension],
    }));
  }, [risks]);

  const selectedRisk = useMemo(
    () => (selectedRiskId ? (risks.find((r) => r.id === selectedRiskId) ?? null) : null),
    [risks, selectedRiskId]
  );

  const name = projectDisplayName?.trim() || null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-screen max-h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 [&>button]:hidden md:h-[min(90vh,calc(100dvh-5rem))] md:max-h-[calc(100dvh-5rem)] md:max-w-[min(90vw,calc(100vw-2rem))] md:rounded-lg">
          <DialogHeader className={PLANNING_TOOL_WINDOW_HEADER_CLASSNAME}>
            <div className="min-w-0">
              <DialogTitle className={cn(PLANNING_TOOL_WINDOW_TITLE_CLASSNAME, 'flex items-center gap-2')}>
                <Crosshair className="h-5 w-5 shrink-0" aria-hidden />
                Risk Dashboard
              </DialogTitle>
              <p className={PLANNING_TOOL_WINDOW_SUBTITLE_CLASSNAME}>
                {name ? name : 'Worst line per component, scored out of 1000'}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-3 py-3 md:px-5 md:py-4">
            {!projectRunId ? (
              <p className="text-sm text-muted-foreground">
                The dashboard reads one project run. Open it from a run's Risk Radar.
              </p>
            ) : loading && risks.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading the risk list
              </p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : (
              <>
                {tableError ? (
                  <p className="mb-3 text-sm text-destructive">{tableError}</p>
                ) : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {sectors.map((sector) => (
                    <ComponentSector
                      key={sector.dimension}
                      dimension={sector.dimension}
                      rows={sector.rows}
                      rollup={sector.rollup}
                      score={sector.score}
                      highlighted={initialDimension === sector.dimension}
                      table={table}
                      onSelectRisk={(risk) => setSelectedRiskId(risk.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={selectedRisk != null} onOpenChange={(next) => (!next ? setSelectedRiskId(null) : undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selectedRisk ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="pr-6 text-base leading-snug">{selectedRisk.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <RiskDrillDown
                  risk={selectedRisk}
                  scoreMeaning={scoreMeaning}
                  table={table}
                  tableError={tableError}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
