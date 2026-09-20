export type InstructionLevelPreference = 'beginner' | 'intermediate' | 'advanced';

/**
 * Maps profile skill (legacy text or overall proficiency 0-100) to workflow detail level.
 */
export function instructionLevelFromProfileSkill(
  skillLevel: string | null | undefined
): InstructionLevelPreference | null {
  if (skillLevel == null) return null;
  const s = String(skillLevel).trim().toLowerCase();
  if (s === '') return null;
  if (s === 'newbie' || s === 'beginner') return 'beginner';
  if (s === 'confident' || s === 'intermediate') return 'intermediate';
  if (s === 'hero' || s === 'advanced') return 'advanced';
  return null;
}

export function instructionLevelFromProficiency(
  proficiency: number | null | undefined
): InstructionLevelPreference | null {
  if (typeof proficiency !== 'number' || !Number.isFinite(proficiency)) return null;
  if (proficiency < 35) return 'beginner';
  if (proficiency < 65) return 'intermediate';
  return 'advanced';
}
