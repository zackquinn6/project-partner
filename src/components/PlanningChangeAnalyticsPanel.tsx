import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  computePlanningChangeAnalyticsMetrics,
  exportPlanningChangeAnalyticsCsv,
  fetchPlanningChangeAnalytics,
  planningToolDisplayLabel,
  type PlanningChangeAnalyticsMetrics,
} from '@/utils/planningChangeAnalytics';

type Props = {
  projectIds: string[] | null;
  selectedProject: string;
  selectedCategory: string;
  dateRange: DateRange | undefined;
};

function fmtMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDays(n: number | null): string {
  if (n == null || Number.isNaN(n)) return 'N/A';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}d`;
}

export function PlanningChangeAnalyticsPanel({
  projectIds,
  selectedProject,
  selectedCategory,
  dateRange,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlanningChangeAnalyticsMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const payload = await fetchPlanningChangeAnalytics({
        projectIds,
        from: dateRange?.from ?? null,
        to: dateRange?.to ?? null,
      });
      if (cancelled) return;
      setMetrics(computePlanningChangeAnalyticsMetrics(payload));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectIds, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()]);

  const chartData = useMemo(() => {
    if (!metrics) return [];
    return metrics.eventsByTool
      .filter((r) => r.count > 0)
      .map((r) => ({
        tool: planningToolDisplayLabel(r.tool),
        count: r.count,
      }));
  }, [metrics]);

  if (loading || !metrics) {
    return <p className="text-sm text-muted-foreground">Loading change analytics…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() =>
            exportPlanningChangeAnalyticsCsv(metrics, {
              project: selectedProject,
              category: selectedCategory,
            })
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Change events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">{metrics.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg per run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {metrics.avgChangesPerRun.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.runsWithChanges} of {metrics.runCount} runs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Timeline delta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {fmtDays(metrics.avgTimelineDeltaDays)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              median {fmtDays(metrics.medianTimelineDeltaDays)} · n=
              {metrics.timelineDeltasDays.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget delta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {fmtMoney(metrics.avgBudgetDelta)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              median {fmtMoney(metrics.medianBudgetDelta)} · n={metrics.budgetDeltas.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Changes by planning tool</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No change events in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="tool" angle={-35} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Events" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Schedule revisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Scheduled runs</div>
              <div className="text-xl font-semibold tabular-nums">{metrics.scheduledRunCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg revisions / scheduled run</div>
              <div className="text-xl font-semibold tabular-nums">
                {metrics.avgRevisionsPerScheduledRun?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Runs with 2+ revisions</div>
              <div className="text-xl font-semibold tabular-nums">
                {metrics.pctRunsWithMultipleRevisions != null
                  ? `${metrics.pctRunsWithMultipleRevisions.toFixed(0)}%`
                  : 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
