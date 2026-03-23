export type ProjectMatchRecommendationTier = 'not_yet' | 'proceed_mindfully' | 'ready_to_start';

/** Internal axis labels matching the decision matrix (not shown in UI). */
export type MatchAxisSentiment = 'negative' | 'neutral' | 'positive';

const SKILL_ORDER = ['beginner', 'intermediate', 'advanced'] as const;
const EFFORT_ORDER = ['low', 'medium', 'high'] as const;

/**
 * Maps user_profiles.physical_capability to the same 0–2 scale as project effort (low/medium/high).
 * Survey (DIYSurveyPopup) stores light | medium | heavy; older data may use limited | moderate | high.
 */
const CAPABILITY_TO_SEGMENT: Record<string, number> = {
  light: 0,
  medium: 1,
  heavy: 2,
  limited: 0,
  moderate: 1,
  high: 2,
  'very high': 2,
};

/** Segment index 0–2, or null if missing / not recognized. */
export function physicalCapabilityToEffortSegment(
  raw: string | null | undefined
): number | null {
  const k = (raw || '').toLowerCase().trim();
  if (!k) return null;
  const seg = CAPABILITY_TO_SEGMENT[k];
  return seg === undefined ? null : seg;
}

/**
 * Compare project-required skill vs user's saved skill level.
 * Returns null when either side is missing or not a known label.
 */
export function getSkillMatchAxis(
  projectSkillLevel: string | null | undefined,
  userSkillLevel: string | null | undefined
): MatchAxisSentiment | null {
  const p = (projectSkillLevel || '').toLowerCase().trim();
  const u = (userSkillLevel || '').toLowerCase().trim();
  if (!p || !u) return null;
  const pi = SKILL_ORDER.indexOf(p as (typeof SKILL_ORDER)[number]);
  const ui = SKILL_ORDER.indexOf(u as (typeof SKILL_ORDER)[number]);
  if (pi < 0 || ui < 0) return null;
  if (ui < pi) return 'negative';
  if (ui === pi) return 'neutral';
  return 'positive';
}

/**
 * Compare project effort vs user's saved physical capability (proxy for effort capacity).
 * Returns null when either side is missing or not mappable.
 */
export function getEffortMatchAxis(
  projectEffortLevel: string | null | undefined,
  userPhysicalCapability: string | null | undefined
): MatchAxisSentiment | null {
  const pe = (projectEffortLevel || '').toLowerCase().trim();
  if (!pe) return null;
  const pi = EFFORT_ORDER.indexOf(pe as (typeof EFFORT_ORDER)[number]);
  if (pi < 0) return null;
  const ui = physicalCapabilityToEffortSegment(userPhysicalCapability);
  if (ui === null) return null;
  if (ui < pi) return 'negative';
  if (ui === pi) return 'neutral';
  return 'positive';
}

/**
 * Decision matrix (Skill Axis × Effort Axis → tier).
 * Rows: Negative+Anything / Anything+Negative → Not Yet; etc.
 */
export function tierFromMatchAxes(
  skill: MatchAxisSentiment,
  effort: MatchAxisSentiment
): ProjectMatchRecommendationTier {
  if (skill === 'negative' || effort === 'negative') return 'not_yet';
  if (skill === 'neutral' && effort === 'neutral') return 'proceed_mindfully';
  if (skill === 'positive' && effort === 'neutral') return 'proceed_mindfully';
  if (skill === 'neutral' && effort === 'positive') return 'proceed_mindfully';
  if (skill === 'positive' && effort === 'positive') return 'ready_to_start';
  return 'proceed_mindfully';
}

function skillReason(axis: MatchAxisSentiment | null): string {
  if (axis === null) {
    return 'Skill can’t be compared yet—your profile or this project is missing a clear skill level on one or both sides.';
  }
  if (axis === 'negative') {
    return 'Your saved skill level is below what this project expects—that gap can make the work harder to finish well.';
  }
  if (axis === 'neutral') {
    return 'Your saved skill level matches what this project expects.';
  }
  return 'Your saved skill level is above what this project expects—you have headroom on technique.';
}

function effortReason(axis: MatchAxisSentiment | null): string {
  if (axis === null) {
    return 'Effort can’t be compared yet—your profile or this project is missing effort level or physical capability on one or both sides.';
  }
  if (axis === 'negative') {
    return 'Your saved effort capability is below what this project needs physically, and that could be tough for you.';
  }
  if (axis === 'neutral') {
    return 'Your effort capability is matched to the project’s effort level—be aware this can still be a demanding project.';
  }
  return 'Your effort capability meets or exceeds what this project needs physically.';
}

function tierSummary(
  tier: ProjectMatchRecommendationTier,
  skillAxis: MatchAxisSentiment | null,
  effortAxis: MatchAxisSentiment | null
): string {
  const incomplete = skillAxis === null || effortAxis === null;
  if (incomplete) {
    return 'Some fit signals are missing, so this recommendation stays cautious until your profile and project data both include skill and effort.';
  }
  if (tier === 'not_yet') {
    return 'Based on your profile compared to this project, we recommend waiting until you’re better aligned on skill and/or physical demand.';
  }
  if (tier === 'proceed_mindfully') {
    return 'You’re close enough to move forward, but stay deliberate about risks, scope, and getting help when you need it.';
  }
  return 'Your profile lines up well with this project’s skill and effort expectations—reasonable to start when you’re ready.';
}

export type ProjectMatchExplanation = {
  tier: ProjectMatchRecommendationTier;
  skillAxis: MatchAxisSentiment | null;
  effortAxis: MatchAxisSentiment | null;
  summary: string;
  challengesParagraph: string;
  reasonSkill: string;
  reasonEffort: string;
};

export function computeProjectMatchExplanation(params: {
  projectSkillLevel: string | null | undefined;
  userSkillLevel: string | null | undefined;
  projectEffortLevel: string | null | undefined;
  userPhysicalCapability: string | null | undefined;
  projectChallengesText: string | null | undefined;
}): ProjectMatchExplanation {
  const skillAxis = getSkillMatchAxis(params.projectSkillLevel, params.userSkillLevel);
  const effortAxis = getEffortMatchAxis(params.projectEffortLevel, params.userPhysicalCapability);

  const tier =
    skillAxis !== null && effortAxis !== null
      ? tierFromMatchAxes(skillAxis, effortAxis)
      : 'proceed_mindfully';

  const challengesRaw = (params.projectChallengesText || '').trim();
  const challengesParagraph = challengesRaw
    ? challengesRaw
    : 'This template doesn’t list specific project challenges—review scope, codes, and site conditions yourself.';

  return {
    tier,
    skillAxis,
    effortAxis,
    summary: tierSummary(tier, skillAxis, effortAxis),
    challengesParagraph,
    reasonSkill: skillReason(skillAxis),
    reasonEffort: effortReason(effortAxis),
  };
}
