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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const stripClassName = 'flex min-h-[min(70vh,520px)] items-stretch gap-2 pb-2';

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
            <div className="space-y-3 border-b bg-muted/40 px-3 py-3">
              <div className="grid grid-cols-3 gap-2 text-center">
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

            <div className="flex flex-1 flex-col px-3 py-3">
              <h3 className="text-center text-sm font-semibold leading-snug text-foreground">{col.title}</h3>
            </div>

            <div className="mt-auto space-y-2 border-t bg-muted/20 px-3 py-3 text-xs">
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
      <Card className="mb-4 border-border/80 shadow-sm">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base font-semibold">Project summary</CardTitle>
          <p className="text-xs text-muted-foreground">
            PFMEA quality risks, workflow time from steps, and Risk-Less timeline / budget register (same merge as Risk-Less
            template view: standard foundation + this template).
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pb-4 pt-0">
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Typical project context</div>
            <div className="mt-1 text-sm text-foreground">
              {typicalProjectSize != null && typicalProjectSize > 0 ? (
                <>
                  <span className="font-medium">Typical size:</span> {typicalProjectSize} {scalingLabel}
                </>
              ) : (
                <span className="text-muted-foreground">No typical size set — typical-project hours below use workflow steps only where shown.</span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Scaling unit:</span> {scalingUnit ?? '—'}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PFMEA — max RPN</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {loading ? <span className="text-muted-foreground">…</span> : projectPfmeaTotals.maxRpn}
              </div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PFMEA — total risks</div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {loading ? <span className="text-muted-foreground">…</span> : projectPfmeaTotals.lineCount}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">Grid line count (failure mode × cause rows)</div>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2.5 sm:col-span-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">PFMEA — action priority</div>
              <table className="mt-2 w-full max-w-xs border-collapse text-center text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border py-1.5 text-xs font-semibold text-red-700 dark:text-red-400">Hi</th>
                    <th className="border-b border-border py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-400">Med</th>
                    <th className="border-b border-border py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Low</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 font-bold tabular-nums">
                      {loading ? '…' : projectPfmeaTotals.high}
                    </td>
                    <td className="py-2 font-bold tabular-nums">
                      {loading ? '…' : projectPfmeaTotals.medium}
                    </td>
                    <td className="py-2 font-bold tabular-nums">
                      {loading ? '…' : projectPfmeaTotals.low}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-card px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Workflow time (main project)</div>
            {!timeBreakdown ? (
              <p className="mt-2 text-sm text-muted-foreground">No phase data for time estimate.</p>
            ) : (
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Per {scalingLabel} (low · med · high)</dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums">
                    {formatLowMedHigh(
                      timeBreakdown.scaledTimePerUnit.low,
                      timeBreakdown.scaledTimePerUnit.medium,
                      timeBreakdown.scaledTimePerUnit.high
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fixed time (low · med · high)</dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums">
                    {formatLowMedHigh(timeBreakdown.fixedTime.low, timeBreakdown.fixedTime.medium, timeBreakdown.fixedTime.high)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Typical project total hours (low · med · high)</dt>
                  <dd className="mt-0.5 font-mono text-xs tabular-nums">
                    {typicalTotalHours ? (
                      formatLowMedHigh(typicalTotalHours.low, typicalTotalHours.medium, typicalTotalHours.high)
                    ) : (
                      <span className="text-muted-foreground">Set typical size to compute total from scaled + fixed.</span>
                    )}
                  </dd>
                </div>
                {timeBreakdown.incorporatedPhases.length > 0 && (
                  <div className="sm:col-span-2 border-t pt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Incorporated phases:</span>{' '}
                    {timeBreakdown.incorporatedPhases.length} linked — see workflow editor for per-phase units.
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="rounded-lg border bg-card px-3 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risk-Less — timeline & budget</div>
              {riskLessLoading && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading
                </span>
              )}
            </div>
            {riskLessError ? (
              <p className="mt-2 text-sm text-destructive">{riskLessError}</p>
            ) : riskLessSummary ? (
              <div className="mt-3 space-y-3">
                <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Total register (merged)</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{riskLessSummary.totalMerged}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">General (standard foundation)</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{riskLessSummary.generalCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">This template only</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{riskLessSummary.projectSpecificCount}</dd>
                  </div>
                </dl>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Severity (register)</div>
                  <table className="mt-1 w-full max-w-md border-collapse text-center text-sm">
                    <thead>
                      <tr>
                        <th className="border-b border-border py-1 text-xs font-semibold">High</th>
                        <th className="border-b border-border py-1 text-xs font-semibold">Medium</th>
                        <th className="border-b border-border py-1 text-xs font-semibold">Low</th>
                        <th className="border-b border-border py-1 text-xs font-semibold text-muted-foreground">Unset</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1.5 font-bold tabular-nums">{riskLessSummary.severityHigh}</td>
                        <td className="py-1.5 font-bold tabular-nums">{riskLessSummary.severityMedium}</td>
                        <td className="py-1.5 font-bold tabular-nums">{riskLessSummary.severityLow}</td>
                        <td className="py-1.5 font-bold tabular-nums text-muted-foreground">{riskLessSummary.severityUnset}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Schedule impact (summed days, low · high scenarios)</dt>
                    <dd className="mt-0.5 font-mono text-xs tabular-nums">
                      {riskLessSummary.risksWithSchedule > 0
                        ? `${riskLessSummary.scheduleDaysLowSum} · ${riskLessSummary.scheduleDaysHighSum} days (${riskLessSummary.risksWithSchedule} risk${riskLessSummary.risksWithSchedule === 1 ? '' : 's'} with schedule fields)`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Budget impact (summed low · high)</dt>
                    <dd className="mt-0.5 font-mono text-xs tabular-nums">
                      {riskLessSummary.risksWithBudget > 0
                        ? `${formatCurrency(riskLessSummary.budgetLowSum)} · ${formatCurrency(riskLessSummary.budgetHighSum)} (${riskLessSummary.risksWithBudget} risk${riskLessSummary.risksWithBudget === 1 ? '' : 's'} with budget fields)`
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : !riskLessLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">No risk data.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
      <header className="flex-shrink-0 border-b bg-background px-4 py-3 md:px-6 md:py-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{projectName}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">Project Visualizer</p>
      </header>

      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
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

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto p-4">
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Process map</div>
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
