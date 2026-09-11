import type { ProjectRun } from '@/interfaces/ProjectRun';

/** Prefer customized project name, then template/default name. */
export function projectRunDisplayName(
  run: Pick<ProjectRun, 'customProjectName' | 'name' | 'id'> | null | undefined
): string | null {
  if (!run) return null;
  const custom = run.customProjectName?.trim();
  if (custom) return custom;
  const name = run.name?.trim();
  if (name) return name;
  return null;
}

/** Human-readable unit for kickoff size estimates. */
export function formatScalingUnitDisplay(
  scalingUnit?: string | null,
  itemType?: string | null
): string {
  if (scalingUnit === 'per square feet' || scalingUnit === 'per square foot') return 'sq ft';
  if (scalingUnit === 'per 10x10 room') return 'rooms';
  if (scalingUnit === 'per linear feet' || scalingUnit === 'per linear foot') return 'linear ft';
  if (scalingUnit === 'per cubic yard') return 'cu yd';
  if (scalingUnit === 'per item') {
    if (itemType?.trim()) return itemType.trim().toLowerCase();
    return 'items';
  }
  return scalingUnit?.trim() || '';
}

/** e.g. "75 sq ft" from kickoff sizing. */
export function formatProjectSizeDetail(
  run: Pick<ProjectRun, 'initial_sizing' | 'scalingUnit'> | null | undefined,
  itemType?: string | null
): string | null {
  const sizing =
    typeof run?.initial_sizing === 'string' ? run.initial_sizing.trim() : '';
  if (!sizing) return null;
  const unit = formatScalingUnitDisplay(run?.scalingUnit, itemType);
  return unit ? `${sizing} ${unit}` : sizing;
}
