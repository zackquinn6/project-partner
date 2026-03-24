import type { ProjectRun } from '@/interfaces/ProjectRun';

export function isRiskFocusRun(run: ProjectRun | null | undefined): boolean {
  const d = run?.customization_decisions;
  if (!d || typeof d !== 'object') return false;
  return (d as { risk_focus?: unknown }).risk_focus === true;
}

/** Dashboard label: strip legacy "Risk Focus: " / "Risk-Less: " prefix from stored name when run is risk-focus. */
export function getRiskFocusAwareDisplayName(run: ProjectRun): string {
  const raw = (run.customProjectName || run.name || '').trim();
  if (!isRiskFocusRun(run)) return raw || run.name;
  const stripped = raw.replace(/^(Risk Focus|Risk-Less):\s*/i, '').trim();
  return stripped || raw || run.name;
}
