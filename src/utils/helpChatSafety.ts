/**
 * Help-chat usage caps and safety helpers (client).
 * Cap: 20 user messages / rolling 7 days (Projects / trial).
 */

export const HELP_MESSAGE_CAP = 20;
export const HELP_CAP_WINDOW_DAYS = 7;

export type HelpUsageStatus = {
  messageCount: number;
  messageCap: number;
  remaining: number;
  capped: boolean;
  periodStart: string | null;
  periodEnd: string | null;
};

export const EMPTY_HELP_USAGE: HelpUsageStatus = {
  messageCount: 0,
  messageCap: HELP_MESSAGE_CAP,
  remaining: HELP_MESSAGE_CAP,
  capped: false,
  periodStart: null,
  periodEnd: null,
};

export type SafetyCategory = 'gas' | 'electrical' | 'structural' | 'injury' | 'general';

const GAS_RE =
  /\b(gas\s*(line|valve|stove|furnace|dryer|appliance|leak)|natural\s*gas|propane|pilot\s*light)\b/i;
const ELECTRICAL_RE =
  /\b(outlet|receptacle|switch|breaker|panel|wiring|wire|fixture|gfci|afci|electrical)\b/i;
const STRUCTURAL_RE =
  /\b(load[\s-]*bearing|joist|beam|header|foundation|structural|remove\s*(a\s*)?wall)\b/i;
const INJURY_RE =
  /\b(injur(y|ed)|bleeding|broke(n)?\s*(bone|arm|leg)|near[\s-]*miss|emergency|911)\b/i;

export function detectSafetyCategories(text: string): SafetyCategory[] {
  const flags = new Set<SafetyCategory>();
  if (GAS_RE.test(text)) flags.add('gas');
  if (ELECTRICAL_RE.test(text)) flags.add('electrical');
  if (STRUCTURAL_RE.test(text)) flags.add('structural');
  if (INJURY_RE.test(text)) flags.add('injury');
  if (flags.size === 0) flags.add('general');
  return [...flags];
}

export function safetyBannerFor(categories: SafetyCategory[]): string | null {
  if (categories.includes('injury')) {
    return 'If anyone is hurt, stop DIY and get medical help. Do not continue the project until it is safe.';
  }
  if (categories.includes('gas')) {
    return 'Gas work is not supported for DIY in Project Partner. Hire a licensed professional.';
  }
  if (categories.includes('structural')) {
    return 'Structural / load-bearing work needs caution. Prefer a licensed pro for anything that affects structural integrity.';
  }
  if (categories.includes('electrical')) {
    return 'Verify local codes allow DIY on outlets, switches, and fixtures before proceeding. Cut power at the breaker.';
  }
  return null;
}
