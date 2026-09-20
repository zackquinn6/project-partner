/**
 * Explicit conservative assumptions for incomplete risk personalization data.
 * Incomplete information means higher risk - never invent competence or certainty.
 */

/** Unrated key-skill proficiency resolves to this floor so low-skill rules can fire. */
export const ASSUMED_LOW_PROFICIENCY = 0;

/** Audit token recorded when a proficiency signal used the floor instead of a user rating. */
export const ASSUMED_LOW_SKILL_REASON = 'assumed_low_skill' as const;

/**
 * Boolean variation factors: unknown means the adverse case for risk.
 * true = adverse condition present (or assumed present when unknown).
 */
export function assumeAdverseBoolean(value: boolean | null | undefined): {
  value: boolean;
  assumed: boolean;
} {
  if (value === true || value === false) {
    return { value, assumed: false };
  }
  return { value: true, assumed: true };
}

/**
 * Numeric “higher is worse” factors (e.g. concealed-conditions likelihood 0-10).
 * Unknown resolves to the high end of the provided scale.
 */
export function assumeHighNumeric(
  value: number | null | undefined,
  highDefault: number
): { value: number; assumed: boolean } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, assumed: false };
  }
  return { value: highDefault, assumed: true };
}

/**
 * Numeric “higher is better” factors (e.g. contingency %, material readiness).
 * Unknown resolves to the low end.
 */
export function assumeLowNumeric(
  value: number | null | undefined,
  lowDefault: number
): { value: number; assumed: boolean } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, assumed: false };
  }
  return { value: lowDefault, assumed: true };
}

export function proficiencyBandLabel(proficiency: number): 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional' {
  if (proficiency >= 85) return 'Professional';
  if (proficiency >= 65) return 'Advanced';
  if (proficiency >= 35) return 'Intermediate';
  return 'Beginner';
}

export function legacySkillLevelToProficiency(skillLevel: string | null | undefined): number | null {
  if (skillLevel === 'newbie') return 15;
  if (skillLevel === 'confident') return 50;
  if (skillLevel === 'hero') return 85;
  return null;
}
