import type { Project } from '@/interfaces/Project';
import type { ProjectRun } from '@/interfaces/ProjectRun';
import {
  BETA_CAMPAIGNS,
  BETA_LAUNCH_DATE,
  CAMPAIGN_A_TARGETS,
  CAMPAIGN_B_TARGETS,
  CAMPAIGN_C_TARGETS,
  PHASE_RATING_SUCCESS_THRESHOLD,
  getCampaignACohortWindow,
  getCampaignWindow,
  type BetaCampaignId,
} from '@/constants/betaCampaigns';
import { isKickoffPhaseComplete } from '@/utils/projectUtils';
import { resolveTemplateFamily } from '@/utils/templateFamilies';

export interface BetaScorecardMetrics {
  signups: number;
  projectsStarted: number;
  projectsFinished: number;
  completionRatePercent: number;
  successfulProjects: number;
  successRatePercent: number;
  /** Campaign C only: users with ≥1 successful finish who started a second tile run */
  repeatUsers: number;
  usersWithSuccessfulFinish: number;
  repeatRatePercent: number;
}

export interface BetaMetricTargetProgress {
  key: keyof BetaScorecardMetrics | 'completionRatePercent' | 'successRatePercent' | 'repeatRatePercent';
  label: string;
  actual: number;
  target: number;
  unit: 'count' | 'percent';
  met: boolean;
  /** Pass/fail floor for Campaign A headline (started, finished, success rate) */
  isPassFailCriterion?: boolean;
}

export interface BetaScorecardResult {
  campaignId: BetaCampaignId;
  campaignName: string;
  goalStatement: string;
  window: { from: Date; to: Date };
  cohortWindow: { from: Date; to: Date };
  metrics: BetaScorecardMetrics;
  targets: BetaMetricTargetProgress[];
  /** Campaign A: started + finished floors and success rate ≥70% */
  campaignPassed: boolean | null;
}

function normalizeCategories(category: ProjectRun['category'] | Project['category'] | string | null | undefined): string[] {
  if (Array.isArray(category)) return category.filter(Boolean).map(String);
  if (typeof category === 'string' && category.trim()) return [category];
  return [];
}

export function isTileProjectRun(
  run: Pick<ProjectRun, 'name' | 'category'>,
  catalogProject?: Pick<Project, 'name' | 'category'> | null
): boolean {
  const runCats = normalizeCategories(run.category);
  if (resolveTemplateFamily(run.name, runCats) === 'tile') return true;
  if (catalogProject) {
    return (
      resolveTemplateFamily(catalogProject.name, normalizeCategories(catalogProject.category)) ===
      'tile'
    );
  }
  return false;
}

/** Left not-started via kickoff or status in-progress/complete; excludes cancelled / not-a-fit. */
export function isProjectStarted(run: Pick<ProjectRun, 'status' | 'completedSteps'>): boolean {
  if (run.status === 'cancelled' || run.status === 'not-a-fit') return false;
  if (run.status === 'in-progress' || run.status === 'complete') return true;
  return isKickoffPhaseComplete(run.completedSteps);
}

export function hasAfterOrFinishPhoto(
  run: Pick<ProjectRun, 'project_photos'>
): boolean {
  const photos = run.project_photos;
  if (!photos) return false;
  const afterCount = photos.after?.length ?? 0;
  if (afterCount > 0) return true;
  // Some uploads land in "during" with finish captions; treat non-empty after only per plan.
  return false;
}

export function averagePhaseRating(
  run: Pick<ProjectRun, 'phase_ratings'>
): number | null {
  const ratings = run.phase_ratings;
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 0), 0);
  return sum / ratings.length;
}

/**
 * Successful tile project (plan definition):
 * 1. status === 'complete'
 * 2. Proof of work: after photo OR after-action review
 * 3. Quality: avg phase_ratings ≥ 4 when ratings exist; otherwise AAR required
 */
export function isSuccessfulProject(
  run: Pick<ProjectRun, 'status' | 'project_photos' | 'phase_ratings'>,
  hasAfterActionReview: boolean
): boolean {
  if (run.status !== 'complete') return false;

  const hasPhotoProof = hasAfterOrFinishPhoto(run);
  const hasProof = hasPhotoProof || hasAfterActionReview;
  if (!hasProof) return false;

  const avg = averagePhaseRating(run);
  if (avg !== null) {
    return avg >= PHASE_RATING_SUCCESS_THRESHOLD;
  }
  return hasAfterActionReview;
}

function inRange(date: Date, from: Date, to: Date): boolean {
  const t = date.getTime();
  return t >= from.getTime() && t < to.getTime();
}

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

export interface CalculateBetaScorecardInput {
  campaignId: BetaCampaignId;
  launchDateIso?: string;
  /** Profiles created in the campaign/signup window (Campaign A window for A; for B/C still A window for signup display) */
  signups: number;
  tileRuns: ProjectRun[];
  /** Run ids that have ≥1 after_action_reviews row */
  aarRunIds: Set<string>;
  /**
   * Optional map runId → user_id for Campaign C repeat rate.
   * When omitted, repeat metrics stay 0.
   */
  runUserIds?: Map<string, string>;
}

export function calculateBetaScorecard(input: CalculateBetaScorecardInput): BetaScorecardResult {
  const launchDateIso = input.launchDateIso ?? BETA_LAUNCH_DATE;
  const def = BETA_CAMPAIGNS[input.campaignId];
  const window = getCampaignWindow(input.campaignId, launchDateIso);
  const cohortWindow = def.usesCampaignACohort
    ? getCampaignACohortWindow(launchDateIso)
    : window;

  // Cohort: tile runs created in cohort window that qualify as started (by measure-through end)
  const measureThrough = window.to;
  const cohortRuns = input.tileRuns.filter((run) => {
    if (!inRange(run.createdAt, cohortWindow.from, cohortWindow.to)) return false;
    // Started by end of measurement window
    return isProjectStarted(run);
  });

  const projectsStarted = cohortRuns.length;
  const finishedRuns = cohortRuns.filter((run) => {
    if (run.status !== 'complete') return false;
    if (run.endDate) return run.endDate.getTime() < measureThrough.getTime();
    return run.updatedAt.getTime() < measureThrough.getTime();
  });
  const projectsFinished = finishedRuns.length;

  const successfulProjects = finishedRuns.filter((run) =>
    isSuccessfulProject(run, input.aarRunIds.has(run.id))
  ).length;

  const completionRatePercent = rate(projectsFinished, projectsStarted);
  const successRatePercent = rate(successfulProjects, projectsFinished);

  // Campaign C: among users with a successful finish in cohort (by measureThrough), who started a 2nd tile run
  let usersWithSuccessfulFinish = 0;
  let repeatUsers = 0;
  if (input.campaignId === 'C' && input.runUserIds) {
    const successByUser = new Map<string, string[]>();
    for (const run of finishedRuns) {
      if (!isSuccessfulProject(run, input.aarRunIds.has(run.id))) continue;
      const uid = input.runUserIds.get(run.id);
      if (!uid) continue;
      const list = successByUser.get(uid) ?? [];
      list.push(run.id);
      successByUser.set(uid, list);
    }
    usersWithSuccessfulFinish = successByUser.size;

    for (const [uid] of successByUser) {
      const userTileRuns = input.tileRuns.filter((r) => input.runUserIds?.get(r.id) === uid);
      const startedAfterFirstSuccess = userTileRuns.filter((r) => isProjectStarted(r)).length >= 2;
      if (startedAfterFirstSuccess) repeatUsers += 1;
    }
  }
  const repeatRatePercent = rate(repeatUsers, usersWithSuccessfulFinish);

  const metrics: BetaScorecardMetrics = {
    signups: input.signups,
    projectsStarted,
    projectsFinished,
    completionRatePercent,
    successfulProjects,
    successRatePercent,
    repeatUsers,
    usersWithSuccessfulFinish,
    repeatRatePercent,
  };

  const targets = buildTargets(input.campaignId, metrics);
  const campaignPassed = evaluatePassFail(input.campaignId, metrics);

  return {
    campaignId: input.campaignId,
    campaignName: def.name,
    goalStatement: def.goalStatement,
    window,
    cohortWindow,
    metrics,
    targets,
    campaignPassed,
  };
}

function buildTargets(
  campaignId: BetaCampaignId,
  metrics: BetaScorecardMetrics
): BetaMetricTargetProgress[] {
  if (campaignId === 'A') {
    return [
      {
        key: 'signups',
        label: 'Signups',
        actual: metrics.signups,
        target: CAMPAIGN_A_TARGETS.signups,
        unit: 'count',
        met: metrics.signups >= CAMPAIGN_A_TARGETS.signups,
      },
      {
        key: 'projectsStarted',
        label: 'Projects started',
        actual: metrics.projectsStarted,
        target: CAMPAIGN_A_TARGETS.projectsStarted,
        unit: 'count',
        met: metrics.projectsStarted >= CAMPAIGN_A_TARGETS.projectsStarted,
        isPassFailCriterion: true,
      },
      {
        key: 'projectsFinished',
        label: 'Projects finished',
        actual: metrics.projectsFinished,
        target: CAMPAIGN_A_TARGETS.projectsFinished,
        unit: 'count',
        met: metrics.projectsFinished >= CAMPAIGN_A_TARGETS.projectsFinished,
        isPassFailCriterion: true,
      },
      {
        key: 'completionRatePercent',
        label: 'Completion rate',
        actual: metrics.completionRatePercent,
        target: CAMPAIGN_A_TARGETS.completionRatePercent,
        unit: 'percent',
        met: metrics.completionRatePercent >= CAMPAIGN_A_TARGETS.completionRatePercent,
      },
      {
        key: 'successRatePercent',
        label: 'Success rate',
        actual: metrics.successRatePercent,
        target: CAMPAIGN_A_TARGETS.successRatePercent,
        unit: 'percent',
        met: metrics.successRatePercent >= CAMPAIGN_A_TARGETS.successRatePercent,
        isPassFailCriterion: true,
      },
    ];
  }

  if (campaignId === 'B') {
    return [
      {
        key: 'completionRatePercent',
        label: 'Cohort completion rate',
        actual: metrics.completionRatePercent,
        target: CAMPAIGN_B_TARGETS.completionRatePercent,
        unit: 'percent',
        met: metrics.completionRatePercent >= CAMPAIGN_B_TARGETS.completionRatePercent,
        isPassFailCriterion: true,
      },
      {
        key: 'successRatePercent',
        label: 'Success rate',
        actual: metrics.successRatePercent,
        target: CAMPAIGN_B_TARGETS.successRatePercent,
        unit: 'percent',
        met: metrics.successRatePercent >= CAMPAIGN_B_TARGETS.successRatePercent,
        isPassFailCriterion: true,
      },
      {
        key: 'projectsStarted',
        label: 'Cohort started (Campaign A)',
        actual: metrics.projectsStarted,
        target: metrics.projectsStarted,
        unit: 'count',
        met: true,
      },
      {
        key: 'projectsFinished',
        label: 'Projects finished',
        actual: metrics.projectsFinished,
        target: metrics.projectsFinished,
        unit: 'count',
        met: true,
      },
    ];
  }

  return [
    {
      key: 'repeatRatePercent',
      label: 'Repeat project rate',
      actual: metrics.repeatRatePercent,
      target: CAMPAIGN_C_TARGETS.repeatRatePercent,
      unit: 'percent',
      met: metrics.repeatRatePercent >= CAMPAIGN_C_TARGETS.repeatRatePercent,
      isPassFailCriterion: true,
    },
    {
      key: 'usersWithSuccessfulFinish',
      label: 'Users with a successful finish',
      actual: metrics.usersWithSuccessfulFinish,
      target: metrics.usersWithSuccessfulFinish,
      unit: 'count',
      met: true,
    },
    {
      key: 'repeatUsers',
      label: 'Users who started a second project',
      actual: metrics.repeatUsers,
      target: metrics.repeatUsers,
      unit: 'count',
      met: true,
    },
  ];
}

function evaluatePassFail(
  campaignId: BetaCampaignId,
  metrics: BetaScorecardMetrics
): boolean | null {
  if (campaignId === 'A') {
    return (
      metrics.projectsStarted >= CAMPAIGN_A_TARGETS.projectsStarted &&
      metrics.projectsFinished >= CAMPAIGN_A_TARGETS.projectsFinished &&
      metrics.successRatePercent >= CAMPAIGN_A_TARGETS.successRatePercent
    );
  }
  if (campaignId === 'B') {
    return (
      metrics.completionRatePercent >= CAMPAIGN_B_TARGETS.completionRatePercent &&
      metrics.successRatePercent >= CAMPAIGN_B_TARGETS.successRatePercent
    );
  }
  if (campaignId === 'C') {
    if (metrics.usersWithSuccessfulFinish === 0) return null;
    return metrics.repeatRatePercent >= CAMPAIGN_C_TARGETS.repeatRatePercent;
  }
  return null;
}

/** Demo numbers for admin demo mode — aligned with locked Campaign A targets. */
export function generateDemoBetaScorecard(campaignId: BetaCampaignId): BetaScorecardResult {
  const launchDateIso = BETA_LAUNCH_DATE;
  const def = BETA_CAMPAIGNS[campaignId];
  const window = getCampaignWindow(campaignId, launchDateIso);
  const cohortWindow = def.usesCampaignACohort
    ? getCampaignACohortWindow(launchDateIso)
    : window;

  let metrics: BetaScorecardMetrics;
  if (campaignId === 'A') {
    metrics = {
      signups: 52,
      projectsStarted: 28,
      projectsFinished: 12,
      completionRatePercent: rate(12, 28),
      successfulProjects: 9,
      successRatePercent: rate(9, 12),
      repeatUsers: 0,
      usersWithSuccessfulFinish: 0,
      repeatRatePercent: 0,
    };
  } else if (campaignId === 'B') {
    metrics = {
      signups: 52,
      projectsStarted: 28,
      projectsFinished: 18,
      completionRatePercent: rate(18, 28),
      successfulProjects: 14,
      successRatePercent: rate(14, 18),
      repeatUsers: 0,
      usersWithSuccessfulFinish: 0,
      repeatRatePercent: 0,
    };
  } else {
    metrics = {
      signups: 52,
      projectsStarted: 28,
      projectsFinished: 18,
      completionRatePercent: rate(18, 28),
      successfulProjects: 14,
      successRatePercent: rate(14, 18),
      repeatUsers: 4,
      usersWithSuccessfulFinish: 14,
      repeatRatePercent: rate(4, 14),
    };
  }

  return {
    campaignId,
    campaignName: def.name,
    goalStatement: def.goalStatement,
    window,
    cohortWindow,
    metrics,
    targets: buildTargets(campaignId, metrics),
    campaignPassed: evaluatePassFail(campaignId, metrics),
  };
}
