/**
 * Severity styling shared by the risk register list and the risk management window, which
 * previously carried byte-identical copies of these three helpers.
 *
 * Colours come from the status tokens, so a single class string reads correctly in light and dark
 * mode without per-variant overrides.
 */

export type RiskSeverityLevel = 'low' | 'medium' | 'high';

export function currentRiskLevelBadgeClass(level: RiskSeverityLevel): string {
  switch (level) {
    case 'high':
      return 'bg-destructive-soft/15 text-destructive-soft border-destructive-soft/40';
    case 'low':
      return 'bg-success/15 text-success border-success/40';
    default:
      return 'bg-warning-soft/20 text-warning-soft border-warning-soft/45';
  }
}

/** Select trigger styling for "What's the new status?" severity. */
export function riskFocusSeveritySelectTriggerClass(level: RiskSeverityLevel): string {
  switch (level) {
    case 'high':
      return 'border-destructive-soft/50 bg-destructive-soft/12 text-destructive-soft';
    case 'low':
      return 'border-success/50 bg-success/12 text-success';
    default:
      return 'border-warning-soft/55 bg-warning-soft/15 text-warning-soft';
  }
}

export function riskFocusSeveritySelectItemClass(level: RiskSeverityLevel): string {
  switch (level) {
    case 'high':
      return 'text-destructive-soft focus:bg-destructive-soft/15 focus:text-destructive-soft';
    case 'low':
      return 'text-success focus:bg-success/15 focus:text-success';
    default:
      return 'text-warning-soft focus:bg-warning-soft/20 focus:text-warning-soft';
  }
}
