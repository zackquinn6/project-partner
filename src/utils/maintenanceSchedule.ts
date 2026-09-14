import { addDays, getDaysInMonth, startOfDay } from 'date-fns';

export type ScheduleType = 'interval' | 'seasonal';

export type SeasonIntent =
  | 'before_freeze'
  | 'heating_startup'
  | 'cooling_startup'
  | 'spring'
  | 'fall'
  | 'spring_and_fall';

export const SEASON_INTENTS: SeasonIntent[] = [
  'before_freeze',
  'heating_startup',
  'cooling_startup',
  'spring',
  'fall',
  'spring_and_fall',
];

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Climate regions produced by zipToClimateRegion in MaintenancePlanWorkflow. */
export type ClimateRegion =
  | 'Northeast'
  | 'Southeast'
  | 'Midwest'
  | 'South / South Central'
  | 'West';

const DEFAULT_CLIMATE: ClimateRegion = 'Northeast';

type ClimateMonthMap = Record<ClimateRegion, number[]>;

const INTENT_MONTHS: Record<SeasonIntent, ClimateMonthMap> = {
  before_freeze: {
    Northeast: [11],
    Midwest: [11],
    Southeast: [12],
    'South / South Central': [1],
    West: [11],
  },
  heating_startup: {
    Northeast: [9],
    Midwest: [9],
    Southeast: [10],
    'South / South Central': [11],
    West: [9],
  },
  cooling_startup: {
    Northeast: [4],
    Midwest: [4],
    Southeast: [3],
    'South / South Central': [3],
    West: [4],
  },
  spring: {
    Northeast: [4],
    Midwest: [4],
    Southeast: [3],
    'South / South Central': [3],
    West: [4],
  },
  fall: {
    Northeast: [10],
    Midwest: [10],
    Southeast: [11],
    'South / South Central': [11],
    West: [10],
  },
  spring_and_fall: {
    Northeast: [4, 10],
    Midwest: [4, 10],
    Southeast: [3, 11],
    'South / South Central': [3, 11],
    West: [4, 10],
  },
};

function normalizeClimateRegion(climateRegion: string | null | undefined): ClimateRegion {
  if (
    climateRegion === 'Northeast' ||
    climateRegion === 'Southeast' ||
    climateRegion === 'Midwest' ||
    climateRegion === 'South / South Central' ||
    climateRegion === 'West'
  ) {
    return climateRegion;
  }
  return DEFAULT_CLIMATE;
}

export function resolveSeasonalMonths(
  intent: SeasonIntent,
  climateRegion: string | null | undefined
): number[] {
  const climate = normalizeClimateRegion(climateRegion);
  return [...INTENT_MONTHS[intent][climate]];
}

export interface ScheduleFields {
  schedule_type?: ScheduleType | string | null;
  frequency_days: number;
  seasonal_months?: number[] | null;
  seasonal_day?: number | null;
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), getDaysInMonth(new Date(year, month - 1, 1)));
}

function dateInMonth(year: number, month: number, day: number): Date {
  const d = clampDay(year, month, day);
  return startOfDay(new Date(year, month - 1, d));
}

/**
 * Next seasonal occurrence on or after `fromDate` (start of day).
 * Used when creating/seeding tasks and when recomputing after schedule edits.
 */
export function nextSeasonalDueOnOrAfter(
  months: number[],
  day: number,
  fromDate: Date
): Date {
  const from = startOfDay(fromDate);
  const uniqueMonths = [...new Set(months.filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b);
  if (uniqueMonths.length === 0) {
    throw new Error('seasonal_months must include at least one month 1–12');
  }

  const year = from.getFullYear();
  for (const offset of [0, 1]) {
    for (const month of uniqueMonths) {
      const candidate = dateInMonth(year + offset, month, day);
      if (candidate.getTime() >= from.getTime()) {
        return candidate;
      }
    }
  }
  // Fallback: first month next year (should be unreachable)
  return dateInMonth(year + 1, uniqueMonths[0], day);
}

/**
 * Next seasonal occurrence strictly after `fromDate`.
 * Used after completing a task so same-day completion advances to the next slot.
 */
export function nextSeasonalDueAfter(
  months: number[],
  day: number,
  fromDate: Date
): Date {
  const from = startOfDay(fromDate);
  const nextDay = addDays(from, 1);
  return nextSeasonalDueOnOrAfter(months, day, nextDay);
}

export function computeNextDue(
  fields: ScheduleFields,
  fromDate: Date,
  mode: 'onOrAfter' | 'after' = 'onOrAfter'
): Date {
  const scheduleType = fields.schedule_type === 'seasonal' ? 'seasonal' : 'interval';
  if (scheduleType === 'seasonal') {
    const months = fields.seasonal_months ?? [];
    const day = fields.seasonal_day ?? 1;
    return mode === 'after'
      ? nextSeasonalDueAfter(months, day, fromDate)
      : nextSeasonalDueOnOrAfter(months, day, fromDate);
  }
  const days = fields.frequency_days;
  if (!days || days < 1) {
    throw new Error('frequency_days must be >= 1 for interval schedules');
  }
  return addDays(fromDate, days);
}

export function formatMonthList(months: number[]): string {
  const unique = [...new Set(months.filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b);
  if (unique.length === 0) return '';
  const names = unique.map((m) => MONTH_NAMES[m - 1]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

export function formatFrequencyLabel(fields: ScheduleFields): string {
  if (fields.schedule_type === 'seasonal') {
    const months = fields.seasonal_months ?? [];
    const label = formatMonthList(months);
    if (!label) return 'Seasonal';
    if (months.length <= 1) return `Annually in ${label}`;
    return label;
  }
  return `Every ${fields.frequency_days} days`;
}

export function isSeasonIntent(value: string | null | undefined): value is SeasonIntent {
  return SEASON_INTENTS.includes(value as SeasonIntent);
}

/** Effective cycle length for progress bars (seasonal ≈ days until next sibling occurrence span). */
export function effectiveFrequencyDays(fields: ScheduleFields): number {
  if (fields.schedule_type === 'seasonal') {
    const months = [...new Set((fields.seasonal_months ?? []).filter((m) => m >= 1 && m <= 12))].sort(
      (a, b) => a - b
    );
    if (months.length <= 1) return 365;
    // Approximate spacing between consecutive seasonal months within a year.
    const gaps: number[] = [];
    for (let i = 0; i < months.length - 1; i++) {
      gaps.push((months[i + 1] - months[i]) * 30);
    }
    gaps.push((12 - months[months.length - 1] + months[0]) * 30);
    const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    return Math.max(30, avg);
  }
  return fields.frequency_days;
}
