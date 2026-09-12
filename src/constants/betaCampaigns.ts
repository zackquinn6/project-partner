/**
 * Beta tile campaign windows and locked targets.
 * Absolute count floors assume an invite cohort sized for ~50 accepted signups (Campaign A).
 * Adjust BETA_LAUNCH_DATE when the beta opens; targets stay fixed unless the invite list changes.
 */

export type BetaCampaignId = 'A' | 'B' | 'C';

/** Calendar date the beta opens (local). Campaign windows are derived from this. */
export const BETA_LAUNCH_DATE = '2026-09-15';

export const PHASE_RATING_SUCCESS_THRESHOLD = 4;

/** Campaign A — “Beta open” (days 0–30): prove discover → start → finish successfully */
export const CAMPAIGN_A_TARGETS = {
  signups: 50,
  projectsStarted: 25,
  projectsFinished: 10,
  completionRatePercent: 40,
  successRatePercent: 70,
} as const;

/** Campaign B — “Finish what you started” (days 31–60): same cohort converts */
export const CAMPAIGN_B_TARGETS = {
  completionRatePercent: 60,
  successRatePercent: 75,
} as const;

/** Campaign C — “Repeat / second project” (days 61–90): stickiness after success */
export const CAMPAIGN_C_TARGETS = {
  repeatRatePercent: 20,
} as const;

export interface BetaCampaignDefinition {
  id: BetaCampaignId;
  name: string;
  goalStatement: string;
  /** Inclusive start offset from launch (days) */
  startDayOffset: number;
  /** Exclusive end offset from launch (days) — window length */
  endDayOffset: number;
  /**
   * For B/C: cohort is runs/users that started in Campaign A’s window;
   * outcomes are measured through this campaign’s end.
   */
  usesCampaignACohort: boolean;
}

export const BETA_CAMPAIGNS: Record<BetaCampaignId, BetaCampaignDefinition> = {
  A: {
    id: 'A',
    name: 'Beta open',
    goalStatement:
      'In 30 days, prove people can discover the app, start a tile project, and finish one successfully.',
    startDayOffset: 0,
    endDayOffset: 30,
    usesCampaignACohort: false,
  },
  B: {
    id: 'B',
    name: 'Finish what you started',
    goalStatement: 'Convert in-progress beta runs into finished, successful jobs.',
    startDayOffset: 30,
    endDayOffset: 60,
    usesCampaignACohort: true,
  },
  C: {
    id: 'C',
    name: 'Repeat / second project',
    goalStatement:
      'Users with one successful tile finish start a second project (stickiness).',
    startDayOffset: 60,
    endDayOffset: 90,
    usesCampaignACohort: true,
  },
};

function parseLaunchDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid BETA_LAUNCH_DATE: ${isoDate}`);
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function getCampaignWindow(
  campaignId: BetaCampaignId,
  launchDateIso: string = BETA_LAUNCH_DATE
): { from: Date; to: Date } {
  const launch = parseLaunchDate(launchDateIso);
  const def = BETA_CAMPAIGNS[campaignId];
  const from = new Date(launch);
  from.setDate(from.getDate() + def.startDayOffset);
  const to = new Date(launch);
  to.setDate(to.getDate() + def.endDayOffset);
  return { from, to };
}

/** Campaign A window — used as the starter cohort for B and C. */
export function getCampaignACohortWindow(launchDateIso: string = BETA_LAUNCH_DATE): {
  from: Date;
  to: Date;
} {
  return getCampaignWindow('A', launchDateIso);
}
