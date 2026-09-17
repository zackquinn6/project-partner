/**
 * The closed signal vocabulary the personalization engine authors rules against.
 *
 * A signal is a raw fact about the user, their tools, their space, or their history. Signals
 * never contain thresholds or verdicts: a rule in `project_risk_rules` does the comparing, so
 * the judgment lives in data rather than here.
 *
 * A signal that cannot be resolved is reported as unresolved with a reason. It is never
 * averaged, defaulted, or guessed, because a rule that fires on an invented value produces a
 * risk picture the user cannot recognize as theirs.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  isToolRequirementOwned,
  loadUserOwnedTools,
  type OwnedToolRecord,
  type ToolRequirementLike,
} from '@/utils/ownedToolsMatching';
import { isTriageType, riskDimensionForTriageType } from '@/utils/reworkEngine';
import { resolveTemplateFamily, type TemplateFamily } from '@/utils/templateFamilies';
import type { RiskDimension } from '@/utils/riskDimensions';

export type RiskSignalGroup = 'profile' | 'tools' | 'environment' | 'behavior';

/** Run-scoped signals hold one value per run. Step-scoped signals hold one value per step. */
export type RiskSignalScope = 'run' | 'step';

export type RiskSignalValueType = 'number' | 'text';

interface RiskSignalDescriptor {
  group: RiskSignalGroup;
  scope: RiskSignalScope;
  valueType: RiskSignalValueType;
  /** Admin-facing name in the rule authoring UI. */
  label: string;
  /** What the number or text actually measures, so a rule author picks the right operator. */
  description: string;
}

/**
 * The whole vocabulary. Adding a signal means adding an entry here and resolving it below;
 * there is no escape hatch for an ad hoc signal, so a rule can never reference something the
 * evaluator cannot resolve.
 */
export const RISK_SIGNALS = {
  'profile.project_skill_level': {
    group: 'profile',
    scope: 'run',
    valueType: 'text',
    label: 'Skill level for this project',
    description:
      'The level the user set for this specific template. Sharpest profile signal, because it is per project type rather than overall.',
  },
  'profile.overall_skill_level': {
    group: 'profile',
    scope: 'run',
    valueType: 'text',
    label: 'Overall skill level',
    description: 'The self-rated level on the user profile, across all projects.',
  },
  'profile.physical_capability': {
    group: 'profile',
    scope: 'run',
    valueType: 'text',
    label: 'Physical capability',
    description: 'The lifting and exertion level on the user profile.',
  },
  'profile.project_type_skill_rating': {
    group: 'profile',
    scope: 'run',
    valueType: 'number',
    label: 'Rated experience with this project type',
    description:
      'The 0 to 100 rating from the project-specific experience survey, matched to this template by project type. Unresolved when the user never rated this type.',
  },
  'profile.avoids_project_type': {
    group: 'profile',
    scope: 'run',
    valueType: 'number',
    label: 'Marked this project type as one to avoid',
    description: '1 when the user flagged this project type as one they would rather avoid, 0 when they did not.',
  },
  'tools.step_tool_count': {
    group: 'tools',
    scope: 'step',
    valueType: 'number',
    label: 'Tools the step calls for',
    description: 'How many tools the step lists, counting a tool with alternates once.',
  },
  'tools.step_tools_owned_count': {
    group: 'tools',
    scope: 'step',
    valueType: 'number',
    label: 'Tools for the step the user owns',
    description: 'How many of the step tools the user owns outright or covers with a listed alternate.',
  },
  'tools.step_tools_missing_count': {
    group: 'tools',
    scope: 'step',
    valueType: 'number',
    label: 'Tools for the step the user does not own',
    description: 'How many step tools are neither owned nor covered by an alternate the user owns.',
  },
  'tools.step_tools_owned_ratio': {
    group: 'tools',
    scope: 'step',
    valueType: 'number',
    label: 'Share of step tools the user owns',
    description: '0 to 1. Unresolved when the step lists no tools, since there is nothing to own.',
  },
  'environment.home_build_year': {
    group: 'environment',
    scope: 'run',
    valueType: 'number',
    label: 'Year the home was built',
    description: 'From the user profile. Rules use it directly for era-specific conditions.',
  },
  'environment.home_ownership': {
    group: 'environment',
    scope: 'run',
    valueType: 'text',
    label: 'Home ownership',
    description: 'Whether the user owns or rents, which changes what they are allowed to alter.',
  },
  'environment.home_material_risk_count': {
    group: 'environment',
    scope: 'run',
    valueType: 'number',
    label: 'Era materials of concern',
    description:
      'How many known hazardous-era materials, such as lead paint or asbestos, were in use when this home was built.',
  },
  'environment.space_count': {
    group: 'environment',
    scope: 'run',
    valueType: 'number',
    label: 'Spaces in this run',
    description: 'How many spaces the run covers. More spaces means more repetition and more handoffs.',
  },
  'environment.largest_space_scale_value': {
    group: 'environment',
    scope: 'run',
    valueType: 'number',
    label: 'Largest space size',
    description: 'The largest scale value among the run spaces, in the template scaling unit.',
  },
  'environment.schedule_tempo': {
    group: 'environment',
    scope: 'run',
    valueType: 'text',
    label: 'Schedule tempo',
    description:
      'The pace the user committed to: fast_track, steady, or extended. A compressed tempo raises how often rushed work goes wrong.',
  },
  'behavior.family_rework_count': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Past problems on this kind of project',
    description:
      'Problems this user reported across every run in this template family, all components. Unresolved until they have run a project in this family.',
  },
  'behavior.family_rework_count_quality': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Past quality problems on this kind of project',
    description: 'Reported problems in this family that counted against quality, such as a failed check or a mistake.',
  },
  'behavior.family_rework_count_safety': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Past safety problems on this kind of project',
    description: 'Reported injuries and near misses in this family.',
  },
  'behavior.family_rework_count_schedule': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Past schedule problems on this kind of project',
    description: 'Reported problems in this family that cost time, such as a missing tool or a delay.',
  },
  'behavior.family_rework_count_budget': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Past budget problems on this kind of project',
    description: 'Reported unplanned work in this family.',
  },
  'behavior.family_stall_count': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Times stuck on this kind of project',
    description: 'How often this user stalled and asked for help on a run in this family.',
  },
  'behavior.family_median_unstick_seconds': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Typical time to get unstuck',
    description:
      'Median seconds between getting stuck and moving again, in this family. A long time means a stall costs this user more than the schedule assumes.',
  },
  'behavior.completed_step_count': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Steps finished in the app',
    description: 'How many steps this user has both started and finished, across all their runs.',
  },
  'behavior.pace_ratio_median': {
    group: 'behavior',
    scope: 'run',
    valueType: 'number',
    label: 'Pace against estimate',
    description:
      'Median of actual time over estimated time across finished steps. Above 1 means this user runs slower than the template assumes.',
  },
  'behavior.step_rework_count': {
    group: 'behavior',
    scope: 'step',
    valueType: 'number',
    label: 'Past problems on this exact step',
    description: 'Problems this user reported on this step before, on any run.',
  },
  'behavior.step_stall_count': {
    group: 'behavior',
    scope: 'step',
    valueType: 'number',
    label: 'Times stuck on this exact step',
    description: 'How often this user stalled on this step before.',
  },
  'behavior.step_pace_ratio_median': {
    group: 'behavior',
    scope: 'step',
    valueType: 'number',
    label: 'Pace against estimate on this step',
    description:
      'Median actual over estimated time for this step on the user prior runs. Unresolved until they have finished it once.',
  },
} as const satisfies Record<string, RiskSignalDescriptor>;

export type RiskSignalKey = keyof typeof RISK_SIGNALS;

export type RunRiskSignalKey = {
  [K in RiskSignalKey]: (typeof RISK_SIGNALS)[K]['scope'] extends 'run' ? K : never;
}[RiskSignalKey];

export type StepRiskSignalKey = {
  [K in RiskSignalKey]: (typeof RISK_SIGNALS)[K]['scope'] extends 'step' ? K : never;
}[RiskSignalKey];

export const RISK_SIGNAL_KEYS = Object.keys(RISK_SIGNALS) as RiskSignalKey[];

export function isRiskSignalKey(value: unknown): value is RiskSignalKey {
  return typeof value === 'string' && value in RISK_SIGNALS;
}

/** Why a signal has no value. Shown in the rule audit so a skipped rule is explainable. */
export type RiskSignalUnresolvedReason =
  /** The user has no profile row at all. */
  | 'no_profile_row'
  /** The row exists but this field was left empty. */
  | 'not_recorded'
  /** The field holds data, but nothing in it matches this project or step. */
  | 'no_match'
  /** The signal is step-scoped and the risk being evaluated is not tied to a step. */
  | 'no_step_context'
  /** The measure is undefined here, such as a ratio over zero tools. */
  | 'not_applicable'
  /** The user has not done enough for this behavioral measure to exist. */
  | 'no_history';

export const RISK_SIGNAL_UNRESOLVED_REASON_TEXT: Record<RiskSignalUnresolvedReason, string> = {
  no_profile_row: 'no profile on file',
  not_recorded: 'left blank on the profile',
  no_match: 'nothing on file matches this project',
  no_step_context: 'this risk is not tied to a step',
  not_applicable: 'does not apply here',
  no_history: 'not enough history yet',
};

export type RiskSignal =
  | { state: 'resolved'; value: number | string }
  | { state: 'unresolved'; reason: RiskSignalUnresolvedReason };

function resolved(value: number | string): RiskSignal {
  return { state: 'resolved', value };
}

function unresolved(reason: RiskSignalUnresolvedReason): RiskSignal {
  return { state: 'unresolved', reason };
}

export interface RiskSignalSet {
  run: Record<RunRiskSignalKey, RiskSignal>;
  /** Keyed by operation_steps.id. Steps not resolved here have no step signals. */
  byStepId: Record<string, Record<StepRiskSignalKey, RiskSignal>>;
}

/**
 * Reads one signal the way the evaluator needs it: step-scoped signals require the step the
 * risk sits on, and a risk with no step gets an unresolved signal rather than a run-level
 * substitute.
 */
export function readRiskSignal(
  signals: RiskSignalSet,
  key: RiskSignalKey,
  operationStepId: string | null
): RiskSignal {
  if (RISK_SIGNALS[key].scope === 'run') {
    return signals.run[key as RunRiskSignalKey];
  }
  if (operationStepId === null) {
    return unresolved('no_step_context');
  }
  const stepSignals = signals.byStepId[operationStepId];
  if (!stepSignals) {
    return unresolved('no_step_context');
  }
  return stepSignals[key as StepRiskSignalKey];
}

export interface RiskSignalContext {
  userId: string;
  projectRunId: string;
  /** The template the run was built from, for per-template profile and history lookups. */
  templateProjectId: string;
  /** Steps that carry risk targets, so tool signals are resolved only where they are used. */
  operationStepIds: readonly string[];
}

function firstNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function textSignal(value: unknown, missingReason: RiskSignalUnresolvedReason): RiskSignal {
  if (typeof value === 'string' && value.trim() !== '') {
    return resolved(value.trim());
  }
  return unresolved(missingReason);
}

/** Tool entries on a step, tolerant of the two shapes the authoring UI has written. */
function parseStepTools(raw: unknown): ToolRequirementLike[] {
  if (!Array.isArray(raw)) return [];
  const tools: ToolRequirementLike[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      if (entry.trim() !== '') tools.push({ name: entry.trim() });
      continue;
    }
    if (entry && typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      tools.push({
        id: typeof obj.id === 'string' ? obj.id : undefined,
        name: typeof obj.name === 'string' ? obj.name : undefined,
        item: typeof obj.item === 'string' ? obj.item : undefined,
        tool_id: typeof obj.tool_id === 'string' ? obj.tool_id : undefined,
        library_tool_id: typeof obj.library_tool_id === 'string' ? obj.library_tool_id : undefined,
        alternates: obj.alternates,
      });
    }
  }
  return tools;
}

/** Signal keys grouped by prefix, so each resolver returns exactly the slice it owns. */
type BehaviorRunSignalKey = Extract<RunRiskSignalKey, `behavior.${string}`>;
type BehaviorStepSignalKey = Extract<StepRiskSignalKey, `behavior.${string}`>;
type ToolStepSignalKey = Extract<StepRiskSignalKey, `tools.${string}`>;

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stepToolSignals(
  tools: ToolRequirementLike[],
  ownedTools: OwnedToolRecord[]
): Record<ToolStepSignalKey, RiskSignal> {
  const total = tools.length;
  const owned = tools.filter((tool) => isToolRequirementOwned(tool, ownedTools)).length;

  return {
    'tools.step_tool_count': resolved(total),
    'tools.step_tools_owned_count': resolved(owned),
    'tools.step_tools_missing_count': resolved(total - owned),
    'tools.step_tools_owned_ratio':
      total === 0 ? unresolved('not_applicable') : resolved(owned / total),
  };
}

interface BehaviorSignals {
  run: Record<BehaviorRunSignalKey, RiskSignal>;
  byStepId: Map<string, Record<BehaviorStepSignalKey, RiskSignal>>;
}

/** Caps the history walk. Older finished steps say little about how this user works now. */
const PACE_HISTORY_ROW_LIMIT = 1000;

/**
 * What the user has actually done: problems they reported, stalls they hit, and how their
 * real step times compared to the estimates.
 *
 * Every measure here is gated on the user having history. A count of zero from a user who has
 * never built anything in this family is not evidence that they do fine; it is absence of
 * evidence, so those signals stay unresolved and the rules that read them do not fire.
 */
async function resolveBehaviorSignals(
  context: RiskSignalContext,
  templateFamily: TemplateFamily
): Promise<BehaviorSignals> {
  const { userId, operationStepIds } = context;

  const [runsResult, reworkResult, stuckResult] = await Promise.all([
    supabase.from('project_runs').select('id, project_id').eq('user_id', userId),
    supabase
      .from('rework_events')
      .select('triage_type, step_id')
      .eq('user_id', userId)
      .eq('template_family', templateFamily),
    supabase
      .from('stuck_events')
      .select('step_id, time_to_unstick_seconds')
      .eq('user_id', userId)
      .eq('template_family', templateFamily),
  ]);

  for (const [label, result] of [
    ['project_runs', runsResult],
    ['rework_events', reworkResult],
    ['stuck_events', stuckResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Risk signal load failed reading ${label}: ${result.error.message}`);
    }
  }

  const userRuns = runsResult.data ?? [];
  const reworkRows = reworkResult.data ?? [];
  const stuckRows = stuckResult.data ?? [];

  const priorRunIdsInFamily = await runIdsInFamily(
    userRuns.filter((run) => run.id !== context.projectRunId),
    templateFamily
  );

  const hasFamilyHistory =
    priorRunIdsInFamily.length > 0 || reworkRows.length > 0 || stuckRows.length > 0;

  const familyOnly = (value: number): RiskSignal =>
    hasFamilyHistory ? resolved(value) : unresolved('no_history');

  const reworkByDimension = new Map<RiskDimension, number>();
  const reworkByStep = new Map<string, number>();
  for (const row of reworkRows) {
    if (isTriageType(row.triage_type)) {
      const dimension = riskDimensionForTriageType(row.triage_type);
      reworkByDimension.set(dimension, (reworkByDimension.get(dimension) ?? 0) + 1);
    }
    if (row.step_id) {
      reworkByStep.set(row.step_id, (reworkByStep.get(row.step_id) ?? 0) + 1);
    }
  }

  const stuckByStep = new Map<string, number>();
  const unstickSeconds: number[] = [];
  for (const row of stuckRows) {
    if (row.step_id) {
      stuckByStep.set(row.step_id, (stuckByStep.get(row.step_id) ?? 0) + 1);
    }
    const seconds = firstNumber(row.time_to_unstick_seconds);
    if (seconds !== null && seconds > 0) {
      unstickSeconds.push(seconds);
    }
  }

  const medianUnstick = median(unstickSeconds);

  const pace = await resolvePaceHistory(
    userRuns.map((run) => run.id),
    operationStepIds
  );

  const byStepId = new Map<string, Record<BehaviorStepSignalKey, RiskSignal>>();
  for (const stepId of operationStepIds) {
    const stepPace = median(pace.ratiosByStepId.get(stepId) ?? []);
    byStepId.set(stepId, {
      'behavior.step_rework_count': familyOnly(reworkByStep.get(stepId) ?? 0),
      'behavior.step_stall_count': familyOnly(stuckByStep.get(stepId) ?? 0),
      'behavior.step_pace_ratio_median':
        stepPace === null ? unresolved('no_history') : resolved(stepPace),
    });
  }

  return {
    run: {
      'behavior.family_rework_count': familyOnly(reworkRows.length),
      'behavior.family_rework_count_quality': familyOnly(reworkByDimension.get('quality') ?? 0),
      'behavior.family_rework_count_safety': familyOnly(reworkByDimension.get('safety') ?? 0),
      'behavior.family_rework_count_schedule': familyOnly(reworkByDimension.get('schedule') ?? 0),
      'behavior.family_rework_count_budget': familyOnly(reworkByDimension.get('budget') ?? 0),
      'behavior.family_stall_count': familyOnly(stuckRows.length),
      'behavior.family_median_unstick_seconds':
        medianUnstick === null ? unresolved('no_history') : resolved(medianUnstick),
      'behavior.completed_step_count': resolved(pace.completedStepCount),
      'behavior.pace_ratio_median':
        pace.overallMedian === null ? unresolved('no_history') : resolved(pace.overallMedian),
    },
    byStepId,
  };
}

/** Which of the user's runs were built from a template in this family. */
async function runIdsInFamily(
  runs: readonly { id: string; project_id: string | null }[],
  templateFamily: TemplateFamily
): Promise<string[]> {
  const projectIds = Array.from(
    new Set(runs.map((run) => run.project_id).filter((id): id is string => id !== null))
  );
  if (projectIds.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, category')
    .in('id', projectIds);
  if (error) {
    throw new Error(`Risk signal load failed reading projects: ${error.message}`);
  }

  const familyByProjectId = new Map<string, TemplateFamily>();
  for (const project of data ?? []) {
    familyByProjectId.set(project.id, resolveTemplateFamily(project.name, project.category));
  }

  return runs
    .filter((run) => run.project_id !== null && familyByProjectId.get(run.project_id) === templateFamily)
    .map((run) => run.id);
}

interface PaceHistory {
  completedStepCount: number;
  overallMedian: number | null;
  ratiosByStepId: Map<string, number[]>;
}

/**
 * Actual against estimated step time. Only steps the user both started and finished count,
 * and only where the template carries an estimate to compare against.
 */
async function resolvePaceHistory(
  runIds: readonly string[],
  operationStepIds: readonly string[]
): Promise<PaceHistory> {
  if (runIds.length === 0) {
    return { completedStepCount: 0, overallMedian: null, ratiosByStepId: new Map() };
  }

  const { data: runtimeRows, error: runtimeError } = await supabase
    .from('user_projects_runtime')
    .select('canonical_step_id, started_at, ended_at')
    .in('project_run_id', [...runIds])
    .not('started_at', 'is', null)
    .not('ended_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(PACE_HISTORY_ROW_LIMIT);
  if (runtimeError) {
    throw new Error(`Risk signal load failed reading user_projects_runtime: ${runtimeError.message}`);
  }

  const rows = runtimeRows ?? [];
  const stepIds = Array.from(new Set(rows.map((row) => row.canonical_step_id).concat(operationStepIds)));

  const estimateByStepId = new Map<string, number>();
  if (stepIds.length > 0) {
    const { data: stepRows, error: stepError } = await supabase
      .from('operation_steps')
      .select('id, time_estimate_med')
      .in('id', stepIds);
    if (stepError) {
      throw new Error(`Risk signal load failed reading operation_steps: ${stepError.message}`);
    }
    for (const step of stepRows ?? []) {
      const estimate = firstNumber(step.time_estimate_med);
      if (estimate !== null && estimate > 0) {
        estimateByStepId.set(step.id, estimate);
      }
    }
  }

  const ratiosByStepId = new Map<string, number[]>();
  const allRatios: number[] = [];
  let completedStepCount = 0;

  for (const row of rows) {
    const started = row.started_at === null ? null : Date.parse(row.started_at);
    const ended = row.ended_at === null ? null : Date.parse(row.ended_at);
    if (started === null || ended === null || !Number.isFinite(started) || !Number.isFinite(ended)) {
      continue;
    }
    const hours = (ended - started) / 3_600_000;
    if (hours <= 0) continue;
    completedStepCount += 1;

    const estimate = estimateByStepId.get(row.canonical_step_id);
    if (estimate === undefined) continue;

    const ratio = hours / estimate;
    allRatios.push(ratio);
    const forStep = ratiosByStepId.get(row.canonical_step_id);
    if (forStep) {
      forStep.push(ratio);
    } else {
      ratiosByStepId.set(row.canonical_step_id, [ratio]);
    }
  }

  return { completedStepCount, overallMedian: median(allRatios), ratiosByStepId };
}

/**
 * Resolves the full signal set for a run. Throws when a query fails, because a rule set
 * evaluated against partially loaded data would silently under-report risk.
 */
export async function resolveRiskSignals(context: RiskSignalContext): Promise<RiskSignalSet> {
  const { userId, projectRunId, templateProjectId, operationStepIds } = context;

  const [
    profileResult,
    projectSkillResult,
    templateResult,
    runResult,
    spacesResult,
    stepsResult,
    ownedTools,
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select(
        'skill_level, physical_capability, project_skills, avoid_projects, home_build_year, home_ownership'
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_project_skill_levels')
      .select('skill_level')
      .eq('user_id', userId)
      .eq('project_id', templateProjectId)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('name, category, project_type')
      .eq('id', templateProjectId)
      .maybeSingle(),
    supabase
      .from('project_runs')
      .select('schedule_events')
      .eq('id', projectRunId)
      .maybeSingle(),
    supabase
      .from('project_run_spaces')
      .select('scale_value')
      .eq('project_run_id', projectRunId),
    operationStepIds.length > 0
      ? supabase
          .from('operation_steps')
          .select('id, tools')
          .in('id', [...operationStepIds])
      : Promise.resolve({ data: [], error: null }),
    loadUserOwnedTools(userId),
  ]);

  for (const [label, result] of [
    ['user_profiles', profileResult],
    ['user_project_skill_levels', projectSkillResult],
    ['projects', templateResult],
    ['project_runs', runResult],
    ['project_run_spaces', spacesResult],
    ['operation_steps', stepsResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Risk signal load failed reading ${label}: ${result.error.message}`);
    }
  }

  const profile = profileResult.data;
  const profileMissing: RiskSignalUnresolvedReason = profile ? 'not_recorded' : 'no_profile_row';

  const buildYear = profile ? firstNumber(profile.home_build_year) : null;

  // Era materials are only knowable once the build year is, so the year gates the lookup.
  let homeMaterialRiskCount: RiskSignal;
  if (buildYear === null) {
    homeMaterialRiskCount = unresolved(profileMissing);
  } else {
    const { count, error } = await supabase
      .from('home_risks')
      .select('id', { count: 'exact', head: true })
      .lte('start_year', buildYear)
      .or(`end_year.is.null,end_year.gte.${buildYear}`);
    if (error) {
      throw new Error(`Risk signal load failed reading home_risks: ${error.message}`);
    }
    homeMaterialRiskCount = count === null ? unresolved('not_recorded') : resolved(count);
  }

  // The experience survey is keyed by project type name, so a rating only applies when the
  // template's type matches a type the user actually rated.
  const projectType = templateResult.data?.project_type?.trim() ?? '';
  const ratedSkills =
    profile && profile.project_skills && typeof profile.project_skills === 'object' && !Array.isArray(profile.project_skills)
      ? (profile.project_skills as Record<string, unknown>)
      : null;

  let projectTypeSkillRating: RiskSignal;
  if (ratedSkills === null) {
    projectTypeSkillRating = unresolved(profileMissing);
  } else if (projectType === '') {
    projectTypeSkillRating = unresolved('no_match');
  } else {
    const rating = firstNumber(ratedSkills[projectType]);
    projectTypeSkillRating = rating === null ? unresolved('no_match') : resolved(rating);
  }

  const avoidList = profile && Array.isArray(profile.avoid_projects) ? profile.avoid_projects : null;
  const avoidsProjectType =
    avoidList === null
      ? unresolved(profileMissing)
      : projectType === ''
        ? unresolved('no_match')
        : resolved(avoidList.includes(projectType) ? 1 : 0);

  const scheduleEvents = runResult.data?.schedule_events;
  const scheduleTempoRaw =
    scheduleEvents && typeof scheduleEvents === 'object' && !Array.isArray(scheduleEvents)
      ? (scheduleEvents as Record<string, unknown>).scheduleTempo
      : null;

  const spaces = spacesResult.data ?? [];
  const spaceScales = spaces
    .map((space) => firstNumber(space.scale_value))
    .filter((value): value is number => value !== null);

  const templateFamily = resolveTemplateFamily(
    templateResult.data?.name,
    templateResult.data?.category
  );
  const behavior = await resolveBehaviorSignals(context, templateFamily);

  const toolSignalsByStepId = new Map<string, Record<ToolStepSignalKey, RiskSignal>>();
  for (const step of stepsResult.data ?? []) {
    toolSignalsByStepId.set(step.id, stepToolSignals(parseStepTools(step.tools), ownedTools));
  }

  const byStepId: RiskSignalSet['byStepId'] = {};
  for (const stepId of operationStepIds) {
    const tools = toolSignalsByStepId.get(stepId);
    const stepBehavior = behavior.byStepId.get(stepId);
    if (!tools || !stepBehavior) {
      // The step id does not exist, so there is nothing to say about it. Leaving it out means
      // rules that target it record no_step_context rather than reading an invented value.
      continue;
    }
    byStepId[stepId] = { ...tools, ...stepBehavior };
  }

  return {
    run: {
      ...behavior.run,
      'profile.project_skill_level': textSignal(
        projectSkillResult.data?.skill_level,
        projectSkillResult.data ? 'not_recorded' : 'no_match'
      ),
      'profile.overall_skill_level': textSignal(profile?.skill_level, profileMissing),
      'profile.physical_capability': textSignal(profile?.physical_capability, profileMissing),
      'profile.project_type_skill_rating': projectTypeSkillRating,
      'profile.avoids_project_type': avoidsProjectType,
      'environment.home_build_year':
        buildYear === null ? unresolved(profileMissing) : resolved(buildYear),
      'environment.home_ownership': textSignal(profile?.home_ownership, profileMissing),
      'environment.home_material_risk_count': homeMaterialRiskCount,
      'environment.space_count': resolved(spaces.length),
      'environment.largest_space_scale_value':
        spaceScales.length === 0 ? unresolved('not_recorded') : resolved(Math.max(...spaceScales)),
      'environment.schedule_tempo': textSignal(scheduleTempoRaw, 'not_recorded'),
    },
    byStepId,
  };
}
