export type InstructionLevelPreference = 'beginner' | 'intermediate' | 'advanced';

/**
 * Maps `user_profiles.skill_level` (survey / DIY profile) to workflow detail level.
 * Survey stores newbie | confident | hero; templates may use Beginner | Intermediate | Advanced.
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
