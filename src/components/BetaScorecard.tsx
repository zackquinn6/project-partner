import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BETA_CAMPAIGNS,
  BETA_LAUNCH_DATE,
  getCampaignACohortWindow,
  type BetaCampaignId,
} from '@/constants/betaCampaigns';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import {
  calculateBetaScorecard,
  generateDemoBetaScorecard,
  isTileProjectRun,
  type BetaScorecardResult,
} from '@/utils/betaMetrics';
import { CheckCircle2, Target, Users, PlayCircle, Flag, Star, Repeat } from 'lucide-react';

interface BetaScorecardProps {
  demoMode?: boolean;
}

type RpcPayload = {
  signups: number;
  runs: Array<Record<string, unknown> & { has_aar?: boolean }>;
};

function parseRpcRuns(rows: RpcPayload['runs']): {
  tileRuns: ProjectRun[];
  aarRunIds: Set<string>;
  runUserIds: Map<string, string>;
} {
  const tileRuns: ProjectRun[] = [];
  const aarRunIds = new Set<string>();
  const runUserIds = new Map<string, string>();

  for (const row of rows) {
    const id = typeof row.id === 'string' ? row.id : null;
    if (!id) continue;

    const createdAt = row.created_at ? new Date(String(row.created_at)) : new Date(0);
    const updatedAt = row.updated_at ? new Date(String(row.updated_at)) : createdAt;
    const startDate = row.start_date ? new Date(String(row.start_date)) : createdAt;
    const endDate = row.end_date ? new Date(String(row.end_date)) : undefined;

    let completedSteps: string[] = [];
    if (Array.isArray(row.completed_steps)) {
      completedSteps = row.completed_steps as string[];
    } else if (typeof row.completed_steps === 'string') {
      try {
        const parsed = JSON.parse(row.completed_steps);
        if (Array.isArray(parsed)) completedSteps = parsed;
      } catch {
        completedSteps = [];
      }
    }

    const phase_ratings = Array.isArray(row.phase_ratings)
      ? (row.phase_ratings as ProjectRun['phase_ratings'])
      : typeof row.phase_ratings === 'string'
        ? (() => {
            try {
              return JSON.parse(row.phase_ratings) as ProjectRun['phase_ratings'];
            } catch {
              return undefined;
            }
          })()
        : (row.phase_ratings as ProjectRun['phase_ratings']);

    const project_photos =
      row.project_photos && typeof row.project_photos === 'object'
        ? (row.project_photos as ProjectRun['project_photos'])
        : typeof row.project_photos === 'string'
          ? (() => {
              try {
                return JSON.parse(row.project_photos) as ProjectRun['project_photos'];
              } catch {
                return undefined;
              }
            })()
          : undefined;

    const category =
      typeof row.category === 'string'
        ? row.category
        : Array.isArray(row.category)
          ? (row.category as string[])
          : undefined;

    const mapped: ProjectRun = {
      id,
      projectId: typeof row.project_id === 'string' ? row.project_id : '',
      name: typeof row.name === 'string' ? row.name : '',
      description: '',
      createdAt,
      updatedAt,
      startDate,
      planEndDate: startDate,
      endDate,
      status: (row.status as ProjectRun['status']) || 'not-started',
      completedSteps,
      progress: 0,
      phases: [],
      category: category as ProjectRun['category'],
      phase_ratings,
      project_photos,
    };

    if (!isTileProjectRun(mapped)) continue;
    tileRuns.push(mapped);
    if (row.has_aar === true) aarRunIds.add(mapped.id);
    if (typeof row.user_id === 'string') runUserIds.set(mapped.id, row.user_id);
  }

  return { tileRuns, aarRunIds, runUserIds };
}

export const BetaScorecard: React.FC<BetaScorecardProps> = ({ demoMode = false }) => {
  const [campaignId, setCampaignId] = useState<BetaCampaignId>('A');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<BetaScorecardResult | null>(null);

  const signupWindow = useMemo(() => getCampaignACohortWindow(BETA_LAUNCH_DATE), []);

  useEffect(() => {
    if (demoMode) {
      setScorecard(generateDemoBetaScorecard(campaignId));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_beta_tile_analytics_payload', {
          p_signup_from: signupWindow.from.toISOString(),
          p_signup_to: signupWindow.to.toISOString(),
        });
        if (rpcError) throw rpcError;
        if (cancelled) return;

        const payload = data as RpcPayload;
        const signups = typeof payload?.signups === 'number' ? payload.signups : Number(payload?.signups ?? 0);
        const { tileRuns, aarRunIds, runUserIds } = parseRpcRuns(
          Array.isArray(payload?.runs) ? payload.runs : []
        );

        setScorecard(
          calculateBetaScorecard({
            campaignId,
            launchDateIso: BETA_LAUNCH_DATE,
            signups,
            tileRuns,
            aarRunIds,
            runUserIds,
          })
        );
      } catch (e) {
        console.error('BetaScorecard:', e);
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load beta metrics');
          setScorecard(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, demoMode, signupWindow.from, signupWindow.to]);

  if (loading) {
    return (
      <Card className="gradient-card border-0 shadow-card">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading beta scorecard…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Beta tile scorecard</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!scorecard) return null;

  const passLabel =
    scorecard.campaignPassed === true
      ? 'Passing'
      : scorecard.campaignPassed === false
        ? 'Not passing'
        : 'Pending';

  return (
    <Card className="gradient-card border-0 shadow-card">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Beta tile scorecard
            </CardTitle>
            <CardDescription>
              Campaign {scorecard.campaignId}: {scorecard.campaignName}. {scorecard.goalStatement}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={scorecard.campaignPassed === true ? 'default' : 'outline'}
              className={
                scorecard.campaignPassed === true
                  ? 'bg-green-600 hover:bg-green-600'
                  : scorecard.campaignPassed === false
                    ? 'border-orange-500 text-orange-700'
                    : ''
              }
            >
              {passLabel}
            </Badge>
            <Select value={campaignId} onValueChange={(v) => setCampaignId(v as BetaCampaignId)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(BETA_CAMPAIGNS) as BetaCampaignId[]).map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}: {BETA_CAMPAIGNS[id].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Window {format(scorecard.window.from, 'MMM d, yyyy')} –{' '}
          {format(scorecard.window.to, 'MMM d, yyyy')}
          {scorecard.campaignId !== 'A' && (
            <>
              {' '}
              · Cohort (started in A) {format(scorecard.cohortWindow.from, 'MMM d')} –{' '}
              {format(scorecard.cohortWindow.to, 'MMM d, yyyy')}
            </>
          )}
          {' '}
          · Launch {BETA_LAUNCH_DATE}
          {demoMode ? ' · Demo data' : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          Success = completed tile job with proof of work (after photo or AAR) and strong phase ratings
          (≥4), or AAR when ratings are missing.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="Signups"
            value={scorecard.metrics.signups.toLocaleString()}
          />
          <MetricTile
            icon={<PlayCircle className="h-5 w-5 text-primary" />}
            label="Started"
            value={scorecard.metrics.projectsStarted.toLocaleString()}
          />
          <MetricTile
            icon={<Flag className="h-5 w-5 text-green-600" />}
            label="Finished"
            value={scorecard.metrics.projectsFinished.toLocaleString()}
          />
          <MetricTile
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            label="Completion"
            value={`${scorecard.metrics.completionRatePercent.toFixed(0)}%`}
          />
          <MetricTile
            icon={
              campaignId === 'C' ? (
                <Repeat className="h-5 w-5 text-violet-600" />
              ) : (
                <Star className="h-5 w-5 text-yellow-500" />
              )
            }
            label={campaignId === 'C' ? 'Repeat rate' : 'Success rate'}
            value={
              campaignId === 'C'
                ? `${scorecard.metrics.repeatRatePercent.toFixed(0)}%`
                : `${scorecard.metrics.successRatePercent.toFixed(0)}%`
            }
          />
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground">Targets vs actual</h4>
          {scorecard.targets.map((t) => {
            const pct =
              t.target > 0 ? Math.min(100, Math.round((t.actual / t.target) * 100)) : t.met ? 100 : 0;
            return (
              <div key={String(t.key)} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {t.label}
                    {t.isPassFailCriterion ? (
                      <span className="ml-1 text-xs text-muted-foreground">(pass/fail)</span>
                    ) : null}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.unit === 'percent'
                      ? `${t.actual.toFixed(0)}% / ≥${t.target}%`
                      : `${Math.round(t.actual)} / ${t.target}`}
                    {t.met ? (
                      <Badge className="ml-2 bg-green-600 hover:bg-green-600" variant="default">
                        Met
                      </Badge>
                    ) : (
                      <Badge className="ml-2" variant="outline">
                        Short
                      </Badge>
                    )}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

export default BetaScorecard;
