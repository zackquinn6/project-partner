import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Phase, Operation, Project } from '@/interfaces/Project';
import {
  calculateOperationTimeEstimate,
  calculatePhaseTimeEstimate,
  calculateProjectTimeEstimate,
  formatScalingUnit,
} from '@/utils/projectTimeEstimation';
import {
  aggregatePfmeaMetrics,
  type PfmeaFailureModeLike,
} from '@/utils/pfmeaRiskMetrics';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ScanSearch } from 'lucide-react';

/** When fitting all steps in view, do not shrink below this scale (avoids unreadable tiny cards on huge projects). */
const FIT_ALL_MIN_SCALE = 0.48;

type ViewMode = 'phases' | 'operations';

type ProjectRiskRow = {
  schedule_impact_low_days: number | null;
  schedule_impact_high_days: number | null;
  budget_impact_low: number | null;
  budget_impact_high: number | null;
  severity: string | null;
};

type RiskLessSummary = {
  totalMerged: number;
  severityHigh: number;
  severityMedium: number;
  severityLow: number;
  severityUnset: number;
  scheduleDaysLowSum: number;
  scheduleDaysHighSum: number;
  budgetLowSum: number;
  budgetHighSum: number;
  risksWithSchedule: number;
  risksWithBudget: number;
};

function isPhaseArray(raw: unknown): raw is Phase[] {
  return Array.isArray(raw) && raw.every((p) => p && typeof p === 'object' && 'id' in p);
}

function operationDisplayName(op: Operation & { operation_name?: string }): string {
  if (typeof op.name === 'string' && op.name.trim()) return op.name.trim();
  if (typeof op.operation_name === 'string' && op.operation_name.trim()) return op.operation_name.trim();
  return 'Operation';
}

function collectStepIdsFromPhase(phase: Phase): Set<string> {
  const ids = new Set<string>();
  const ops = phase.operations ?? [];
  for (const op of ops) {
    for (const step of op.steps ?? []) {
      if (step?.id) ids.add(step.id);
    }
  }
  return ids;
}

function collectStepIdsFromOperation(op: Operation): Set<string> {
  const ids = new Set<string>();
  for (const step of op.steps ?? []) {
    if (step?.id) ids.add(step.id);
  }
  return ids;
}

function formatHoursShort(hours: number): string {
  if (hours < 1 / 60) return `${Math.round(hours * 3600)}s`;
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatLowMedHigh(low: number, medium: number, high: number): string {
  return `${formatHoursShort(low)} · ${formatHoursShort(medium)} · ${formatHoursShort(high)}`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function summarizeRiskLessRows(merged: ProjectRiskRow[]): RiskLessSummary {
  let severityHigh = 0;
  let severityMedium = 0;
  let severityLow = 0;
  let severityUnset = 0;
  let scheduleDaysLowSum = 0;
  let scheduleDaysHighSum = 0;
  let budgetLowSum = 0;
  let budgetHighSum = 0;
  let risksWithSchedule = 0;
  let risksWithBudget = 0;

  for (const r of merged) {
    const sev = typeof r.severity === 'string' ? r.severity.toLowerCase() : '';
    if (sev === 'high') severityHigh += 1;
    else if (sev === 'medium') severityMedium += 1;
    else if (sev === 'low') severityLow += 1;
    else severityUnset += 1;

    const slo = r.schedule_impact_low_days;
    const shi = r.schedule_impact_high_days;
    if (slo != null || shi != null) {
      const lowVal = slo ?? shi;
      const highVal = shi ?? slo;
      if (lowVal != null) scheduleDaysLowSum += lowVal;
      if (highVal != null) scheduleDaysHighSum += highVal;
      risksWithSchedule += 1;
    }

    const blo = r.budget_impact_low;
    const bhi = r.budget_impact_high;
    if (blo != null || bhi != null) {
      const lowB = blo ?? bhi;
      const highB = bhi ?? blo;
      if (lowB != null) budgetLowSum += lowB;
      if (highB != null) budgetHighSum += highB;
      risksWithBudget += 1;
    }
  }

  return {
    totalMerged: merged.length,
    severityHigh,
    severityMedium,
    severityLow,
    severityUnset,
    scheduleDaysLowSum,
    scheduleDaysHighSum,
    budgetLowSum,
    budgetHighSum,
    risksWithSchedule,
    risksWithBudget,
  };
}

export interface ProjectVisualizerProps {
  projectId: string;
  projectName: string;
  phases: unknown;
  typicalProjectSize: number | null;
  scalingUnit: string | null;
}

export const ProjectVisualizer: React.FC<ProjectVisualizerProps> = ({
  projectId,
  projectName,
  phases: phasesRaw,
  typicalProjectSize,
  scalingUnit,
}) => {
  const [mode, setMode] = useState<ViewMode>('phases');
  const [failureModes, setFailureModes] = useState<PfmeaFailureModeLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskLessSummary, setRiskLessSummary] = useState<
    (RiskLessSummary & { generalCount: number; projectSpecificCount: number }) | null
  >(null);
  const [riskLessLoading, setRiskLessLoading] = useState(true);
  const [riskLessError, setRiskLessError] = useState<string | null>(null);
  const [fitAllInView, setFitAllInView] = useState(false);
  const [fitPack, setFitPack] = useState<{ scale: number; w: number; h: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const phases = useMemo(() => (isPhaseArray(phasesRaw) ? phasesRaw : []), [phasesRaw]);

  const loadFailureModes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fmError } = await supabase
        .from('pfmea_failure_modes')
        .select(
          `
          id,
          project_id,
          operation_step_id,
          severity_score,
          pfmea_potential_effects(id, severity_score),
          pfmea_potential_causes(id, occurrence_score),
          pfmea_controls(id, control_type, detection_score)
        `
        )
        .eq('project_id', projectId);

      if (fmError) throw fmError;
      setFailureModes((data ?? []) as PfmeaFailureModeLike[]);
    } catch (e) {
      console.error(e);
      setError('Failed to load PFMEA data');
      setFailureModes([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadRiskLessSummary = useCallback(async () => {
    setRiskLessLoading(true);
    setRiskLessError(null);
    try {
      const riskSelect =
        'schedule_impact_low_days, schedule_impact_high_days, budget_impact_low, budget_impact_high, severity';

      const { data: standardProject, error: standardProjectError } = await supabase
        .from('projects')
        .select('id')
        .eq('is_standard', true)
        .single();

      if (standardProjectError) throw standardProjectError;
      const standardId = standardProject?.id;
      if (!standardId || typeof standardId !== 'string') {
        throw new Error('Standard project foundation not found (is_standard = true).');
      }

      let foundationRows: ProjectRiskRow[] = [];
      let templateRows: ProjectRiskRow[] = [];

      if (standardId === projectId) {
        const { data, error: qErr } = await supabase
          .from('project_risks')
          .select(riskSelect)
          .eq('project_id', projectId)
          .order('display_order', { ascending: true });

        if (qErr) throw qErr;
        foundationRows = (data ?? []) as ProjectRiskRow[];
        templateRows = [];
      } else {
        const [{ data: foundationData, error: foundationError }, { data: projectData, error: projectError }] =
          await Promise.all([
            supabase
              .from('project_risks')
              .select(riskSelect)
              .eq('project_id', standardId)
              .order('display_order', { ascending: true }),
            supabase
              .from('project_risks')
              .select(riskSelect)
              .eq('project_id', projectId)
              .order('display_order', { ascending: true }),
          ]);

        if (foundationError) throw foundationError;
        if (projectError) throw projectError;
        foundationRows = (foundationData ?? []) as ProjectRiskRow[];
        templateRows = (projectData ?? []) as ProjectRiskRow[];
      }

      const merged = [...foundationRows, ...templateRows];
      const base = summarizeRiskLessRows(merged);
      setRiskLessSummary({
        ...base,
        generalCount: foundationRows.length,
        projectSpecificCount: templateRows.length,
      });
    } catch (e) {
      console.error(e);
      setRiskLessError('Failed to load Risk-Less register');
      setRiskLessSummary(null);
    } finally {
      setRiskLessLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadFailureModes();
  }, [loadFailureModes]);

  useEffect(() => {
    void loadRiskLessSummary();
  }, [loadRiskLessSummary]);

  const failureModesByStep = useMemo(() => {
    const byStep = new Map<string, PfmeaFailureModeLike[]>();
    for (const fm of failureModes) {
      const sid = fm.operation_step_id;
      const list = byStep.get(sid);
      if (list) list.push(fm);
      else byStep.set(sid, [fm]);
    }
    return byStep;
  }, [failureModes]);

  const aggregateForStepIds = useCallback(
    (stepIds: Set<string>) => {
      const list: PfmeaFailureModeLike[] = [];
      for (const sid of stepIds) {
        const fms = failureModesByStep.get(sid);
        if (fms) list.push(...fms);
      }
      return aggregatePfmeaMetrics(list);
    },
    [failureModesByStep]
  );

  const projectPfmeaTotals = useMemo(() => aggregatePfmeaMetrics(failureModes), [failureModes]);

  const scalingLabel = formatScalingUnit(scalingUnit ?? undefined);

  const projectForTimeEstimate = useMemo((): Project | null => {
    if (phases.length === 0) return null;
    const su = scalingUnit;
    const allowed = ['per square feet', 'per 10x10 room', 'per linear feet', 'per cubic yard', 'per item'] as const;
    const scalingUnitTyped = allowed.includes(su as (typeof allowed)[number]) ? (su as Project['scalingUnit']) : undefined;
    return {
      id: projectId,
      name: projectName,
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: [],
      phases,
      scalingUnit: scalingUnitTyped,
      typicalProjectSize: typicalProjectSize ?? undefined,
    };
  }, [projectId, projectName, phases, scalingUnit, typicalProjectSize]);

  const timeBreakdown = useMemo(() => {
    if (!projectForTimeEstimate) return null;
    return calculateProjectTimeEstimate(projectForTimeEstimate);
  }, [projectForTimeEstimate]);

  const typicalTotalHours = useMemo(() => {
    if (typicalProjectSize == null || typicalProjectSize <= 0 || !timeBreakdown) return null;
    const { fixedTime, scaledTimePerUnit } = timeBreakdown;
    return {
      low: fixedTime.low + scaledTimePerUnit.low * typicalProjectSize,
      medium: fixedTime.medium + scaledTimePerUnit.medium * typicalProjectSize,
      high: fixedTime.high + scaledTimePerUnit.high * typicalProjectSize,
    };
  }, [timeBreakdown, typicalProjectSize]);

  const columns = useMemo(() => {
    if (mode === 'phases') {
      return phases.map((phase) => {
        const stepIds = collectStepIdsFromPhase(phase);
        const metrics = aggregateForStepIds(stepIds);
        const te = calculatePhaseTimeEstimate(phase);
        const typical =
          typicalProjectSize != null && typicalProjectSize > 0
            ? {
                low: te.fixedTime.low + te.timePerUnit.low * typicalProjectSize,
                medium: te.fixedTime.medium + te.timePerUnit.medium * typicalProjectSize,
                high: te.fixedTime.high + te.timePerUnit.high * typicalProjectSize,
              }
            : null;
        return {
          key: phase.id,
          title: phase.name,
          metrics,
          timePerUnit: te.timePerUnit,
          fixed: te.fixedTime,
          typical,
        };
      });
    }

    const out: Array<{
      key: string;
      title: string;
      metrics: ReturnType<typeof aggregatePfmeaMetrics>;
      timePerUnit: { low: number; medium: number; high: number };
      fixed: { low: number; medium: number; high: number };
      typical: { low: number; medium: number; high: number } | null;
    }> = [];

    for (const phase of phases) {
      for (const op of phase.operations ?? []) {
        const stepIds = collectStepIdsFromOperation(op);
        const metrics = aggregateForStepIds(stepIds);
        const te = calculateOperationTimeEstimate(op);
        const typical =
          typicalProjectSize != null && typicalProjectSize > 0
            ? {
                low: te.fixedTime.low + te.timePerUnit.low * typicalProjectSize,
                medium: te.fixedTime.medium + te.timePerUnit.medium * typicalProjectSize,
                high: te.fixedTime.high + te.timePerUnit.high * typicalProjectSize,
              }
            : null;
        out.push({
          key: op.id,
          title: `${phase.name} — ${operationDisplayName(op as Operation & { operation_name?: string })}`,
          metrics,
          timePerUnit: te.timePerUnit,
          fixed: te.fixedTime,
          typical,
        });
      }
    }
    return out;
  }, [mode, phases, aggregateForStepIds, typicalProjectSize]);

  const recomputeFitAll = useCallback(() => {
    if (!fitAllInView) return;
    const el = stripRef.current;
    const vp = viewportRef.current;
    if (!el || !vp) return;
    const w = el.scrollWidth;
    const h = el.scrollHeight;
    const vw = Math.max(0, vp.clientWidth - 32);
    if (w <= 0 || h <= 0) return;
    const raw = vw / w;
    const scale = Math.min(1, Math.max(FIT_ALL_MIN_SCALE, raw));
    setFitPack({ scale, w, h });
  }, [fitAllInView]);

  useLayoutEffect(() => {
    if (!fitAllInView) {
      setFitPack(null);
      return;
    }
    recomputeFitAll();
  }, [fitAllInView, recomputeFitAll, columns.length, mode, loading, error, phases.length]);

  useEffect(() => {
    if (!fitAllInView) return;
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recomputeFitAll());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [fitAllInView, recomputeFitAll]);

  const stripClassName = 'flex min-h-[min(65vh,480px)] items-stretch gap-2 pb-1';

  const processMapStrip = (
    <div ref={stripRef} className={stripClassName}>
      {columns.map((col, idx) => (
        <React.Fragment key={col.key}>
          {idx > 0 && (
            <div className="flex flex-shrink-0 items-center text-muted-foreground/50" aria-hidden>
              <ArrowRight className="h-5 w-5" />
            </div>
          )}
          <div
            className={cn(
              'flex w-[min(100%,280px)] flex-shrink-0 flex-col rounded-xl border bg-card shadow-sm',
              'min-w-[220px]'
            )}
          >
            <div className="space-y-2 border-b bg-muted/40 px-2 py-2">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Max RPN</div>
                  <div className="text-lg font-bold tabular-nums text-foreground">{col.metrics.maxRpn}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PFMEA Risks</div>
                  <div className="text-lg font-bold tabular-nums text-foreground">{col.metrics.lineCount}</div>
                </div>
                <div className="flex flex-col items-stretch justify-center">
                  <table className="w-full border-collapse text-center text-[10px]">
                    <thead>
                      <tr>
                        <th className="border-b border-border/60 px-0.5 py-0.5 font-semibold uppercase tracking-wide text-muted-foreground">
                          Hi
                        </th>
                        <th className="border-b border-border/60 px-0.5 py-0.5 font-semibold uppercase tracking-wide text-muted-foreground">
                          Med
                        </th>
                        <th className="border-b border-border/60 px-0.5 py-0.5 font-semibold uppercase tracking-wide text-muted-foreground">
                          Low
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-0.5 py-0.5 font-bold tabular-nums text-red-700 dark:text-red-400">
                          {col.metrics.high}
                        </td>
                        <td className="px-0.5 py-0.5 font-bold tabular-nums text-orange-700 dark:text-orange-400">
                          {col.metrics.medium}
                        </td>
                        <td className="px-0.5 py-0.5 font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {col.metrics.low}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-2 py-2">
              <h3 className="text-center text-sm font-semibold leading-snug text-foreground">{col.title}</h3>
            </div>

            <div className="mt-auto space-y-1.5 border-t bg-muted/20 px-2 py-2 text-xs">
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground">Time (low · med · high)</div>
                <div className="font-mono text-[11px] text-foreground">
                  <span className="text-muted-foreground">Per {scalingLabel}: </span>
                  {formatLowMedHigh(col.timePerUnit.low, col.timePerUnit.medium, col.timePerUnit.high)}
                </div>
                {col.fixed.low + col.fixed.medium + col.fixed.high > 0 && (
                  <div className="mt-1 font-mono text-[11px] text-foreground">
                    <span className="text-muted-foreground">Fixed: </span>
                    {formatLowMedHigh(col.fixed.low, col.fixed.medium, col.fixed.high)}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-0.5 font-medium text-muted-foreground">Typical project</div>
                {col.typical ? (
                  <div className="font-mono text-[11px] text-foreground">
                    {formatLowMedHigh(col.typical.low, col.typical.medium, col.typical.high)}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">—</div>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  const summaryBlock =
    phases.length > 0 ? (
      <section
        className="mb-2 rounded-md border border-border/70 bg-card px-2 py-1.5 text-xs shadow-sm"
        aria-label="Project summary"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/50 pb-1 text-[11px] leading-tight">
          <span className="shrink-0 font-semibold text-foreground">Summary</span>
          <span className="hidden h-3 w-px shrink-0 bg-border sm:block" aria-hidden />
          <span className="text-muted-foreground">
            {typicalProjectSize != null && typicalProjectSize > 0 ? (
              <>
                Typical <span className="font-medium text-foreground">{typicalProjectSize}</span> {scalingLabel}
              </>
            ) : (
              'No typical size'
            )}
          </span>
          <span className="text-muted-foreground/70">·</span>
          <span className="text-muted-foreground">
            Scale <span className="font-mono text-[10px] text-foreground/90">{scalingUnit ?? '—'}</span>
          </span>
        </div>

        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
          <div className="rounded border border-border/50 bg-muted/20 px-1.5 py-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PFMEA</div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0 font-mono text-[11px] tabular-nums leading-none">
              <span>
                RPN{' '}
                <span className="font-bold text-foreground">{loading ? '…' : projectPfmeaTotals.maxRpn}</span>
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span>
                Lines{' '}
                <span className="font-bold text-foreground">{loading ? '…' : projectPfmeaTotals.lineCount}</span>
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] font-semibold tabular-nums leading-none">
              <span className="text-red-700 dark:text-red-400">H {loading ? '…' : projectPfmeaTotals.high}</span>
              <span className="text-orange-700 dark:text-orange-400">M {loading ? '…' : projectPfmeaTotals.medium}</span>
              <span className="text-emerald-700 dark:text-emerald-600">L {loading ? '…' : projectPfmeaTotals.low}</span>
            </div>
          </div>

          <div className="rounded border border-border/50 bg-muted/20 px-1.5 py-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Workflow time</div>
            {!timeBreakdown ? (
              <div className="mt-0.5 text-[11px] text-muted-foreground">No phase data</div>
            ) : (
              <div className="mt-0.5 space-y-0.5 font-mono text-[10px] leading-tight tabular-nums">
                <div className="min-w-0 break-all">
                  <span className="text-muted-foreground">Per {scalingLabel} </span>
                  {formatLowMedHigh(
                    timeBreakdown.scaledTimePerUnit.low,
                    timeBreakdown.scaledTimePerUnit.medium,
                    timeBreakdown.scaledTimePerUnit.high
                  )}
                </div>
                <div className="min-w-0 break-all">
                  <span className="text-muted-foreground">Fx </span>
                  {formatLowMedHigh(timeBreakdown.fixedTime.low, timeBreakdown.fixedTime.medium, timeBreakdown.fixedTime.high)}
                </div>
                <div className="min-w-0 break-all">
                  <span className="text-muted-foreground">Tot </span>
                  {typicalTotalHours ? (
                    formatLowMedHigh(typicalTotalHours.low, typicalTotalHours.medium, typicalTotalHours.high)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                {timeBreakdown.incorporatedPhases.length > 0 ? (
                  <div className="text-[10px] text-muted-foreground">+{timeBreakdown.incorporatedPhases.length} linked</div>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded border border-border/50 bg-muted/20 px-1.5 py-1">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Risk-Less</div>
              {riskLessLoading ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" aria-label="Loading" /> : null}
            </div>
            {riskLessError ? (
              <p className="mt-0.5 text-[11px] text-destructive">{riskLessError}</p>
            ) : riskLessSummary ? (
              <div className="mt-0.5 space-y-0.5 text-[10px] leading-tight">
                <div className="font-mono tabular-nums">
                  <span className="font-semibold text-foreground">{riskLessSummary.totalMerged}</span>
                  <span className="text-muted-foreground"> reg · </span>
                  <span>
                    G{riskLessSummary.generalCount}+P{riskLessSummary.projectSpecificCount}
                  </span>
                </div>
                <div className="tabular-nums">
                  <span className="font-semibold text-red-700 dark:text-red-400">H{riskLessSummary.severityHigh}</span>
                  <span className="text-muted-foreground"> </span>
                  <span className="font-semibold text-orange-700 dark:text-orange-400">M{riskLessSummary.severityMedium}</span>
                  <span className="text-muted-foreground"> </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-600">L{riskLessSummary.severityLow}</span>
                  <span className="text-muted-foreground"> </span>
                  <span className="font-semibold text-muted-foreground">∅{riskLessSummary.severityUnset}</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {riskLessSummary.risksWithSchedule > 0
                    ? `Δ ${riskLessSummary.scheduleDaysLowSum}–${riskLessSummary.scheduleDaysHighSum}d · ${riskLessSummary.risksWithSchedule} w/sched`
                    : 'Δ —'}
                  <span className="text-muted-foreground/50"> · </span>
                  {riskLessSummary.risksWithBudget > 0
                    ? `${formatCurrency(riskLessSummary.budgetLowSum)}–${formatCurrency(riskLessSummary.budgetHighSum)} · ${riskLessSummary.risksWithBudget} w/$`
                    : '$ —'}
                </div>
              </div>
            ) : !riskLessLoading ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">No risk data</p>
            ) : null}
          </div>
        </div>
      </section>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
      <header className="flex-shrink-0 border-b bg-background px-3 py-2 md:px-5 md:py-2.5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{projectName}</h1>
      </header>

      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 md:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Group by</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">Phases</span>
            <Switch
              id="viz-mode"
              checked={mode === 'operations'}
              onCheckedChange={(checked) => {
                setFitAllInView(false);
                setFitPack(null);
                setMode(checked ? 'operations' : 'phases');
              }}
              aria-label="Toggle between phases and operations"
            />
            <span className="text-sm">Operations</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={loading || !!error || phases.length === 0 || columns.length === 0}
            aria-pressed={fitAllInView}
            onClick={() => setFitAllInView((prev) => !prev)}
          >
            <ScanSearch className="h-3.5 w-3.5" />
            {fitAllInView ? 'Reset zoom' : 'Zoom correct'}
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto px-3 py-2 md:px-4">
        {loading && (
          <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading PFMEA…
          </div>
        )}
        {!loading && error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        )}
        {!loading && !error && phases.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No workflow phases in this project yet.
          </div>
        )}
        {!loading && !error && phases.length > 0 && (
          <>
            {summaryBlock}
            <div className="mb-1 flex min-h-[1.25rem] items-center gap-2 pt-0.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Process map
              </span>
              <div className="h-px min-w-[1.5rem] flex-1 bg-border/70" aria-hidden />
            </div>
            {fitAllInView && fitPack ? (
              <div className="flex justify-center">
                <div
                  className="overflow-hidden rounded-lg"
                  style={{
                    width: fitPack.w * fitPack.scale,
                    height: fitPack.h * fitPack.scale,
                  }}
                >
                  <div
                    style={{
                      width: fitPack.w,
                      transform: `scale(${fitPack.scale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    {processMapStrip}
                  </div>
                </div>
              </div>
            ) : (
              processMapStrip
            )}
          </>
        )}
      </div>
    </div>
  );
};
