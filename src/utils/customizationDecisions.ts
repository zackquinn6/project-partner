/**
 * Normalize customization_decisions from API (object or JSON string) for client reads.
 */
export function parseCustomizationDecisions(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/** True when Planning Studio Scope (project customizer) has been completed for this run. */
export function isPlanningScopeComplete(customizationDecisions: unknown): boolean {
  const decisions = parseCustomizationDecisions(customizationDecisions);
  const completed = decisions.planning_wizard_completed_tools;
  return Array.isArray(completed) && completed.includes('scope');
}
