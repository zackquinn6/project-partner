/**
 * US federal / commonly observed holidays for scheduling blackouts.
 * Dates are calendar YYYY-MM-DD in local interpretation (no timezone shift).
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number): Date {
  const first = new Date(year, monthIndex, 1);
  const firstWeekday = first.getDay();
  let day = 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
  return new Date(year, monthIndex, day);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
  const last = new Date(year, monthIndex + 1, 0);
  const diff = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, last.getDate() - diff);
}

/** Mother's Day = 2nd Sunday of May (US). */
export function mothersDay(year: number): Date {
  return nthWeekdayOfMonth(year, 4, 0, 2);
}

/** Labor Day = 1st Monday of September (US). */
export function laborDay(year: number): Date {
  return nthWeekdayOfMonth(year, 8, 1, 1);
}

export interface NamedHoliday {
  name: string;
  date: string; // YYYY-MM-DD
}

export function usHolidaysForYear(year: number): NamedHoliday[] {
  return [
    { name: "New Year's Day", date: formatYmd(new Date(year, 0, 1)) },
    { name: 'Martin Luther King Jr. Day', date: formatYmd(nthWeekdayOfMonth(year, 0, 1, 3)) },
    { name: "Presidents' Day", date: formatYmd(nthWeekdayOfMonth(year, 1, 1, 3)) },
    { name: 'Memorial Day', date: formatYmd(lastWeekdayOfMonth(year, 4, 1)) },
    { name: 'Juneteenth', date: formatYmd(new Date(year, 5, 19)) },
    { name: 'Independence Day', date: formatYmd(new Date(year, 6, 4)) },
    { name: 'Labor Day', date: formatYmd(laborDay(year)) },
    { name: 'Columbus Day', date: formatYmd(nthWeekdayOfMonth(year, 9, 1, 2)) },
    { name: 'Veterans Day', date: formatYmd(new Date(year, 10, 11)) },
    { name: 'Thanksgiving', date: formatYmd(nthWeekdayOfMonth(year, 10, 4, 4)) },
    { name: 'Christmas Day', date: formatYmd(new Date(year, 11, 25)) },
    { name: "Mother's Day", date: formatYmd(mothersDay(year)) },
    { name: "Father's Day", date: formatYmd(nthWeekdayOfMonth(year, 5, 0, 3)) },
  ];
}

export function usHolidaysInRange(from: Date, to: Date): NamedHoliday[] {
  const years = new Set<number>();
  years.add(from.getFullYear());
  years.add(to.getFullYear());
  const fromKey = formatYmd(from);
  const toKey = formatYmd(to);
  const out: NamedHoliday[] = [];
  for (const y of years) {
    for (const h of usHolidaysForYear(y)) {
      if (h.date >= fromKey && h.date <= toKey) out.push(h);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Resolve a holiday name to the next matching date on/after `today` within `yearsAhead` years. */
export function resolveHolidayName(name: string, today: Date, yearsAhead = 1): string | null {
  const normalized = name.trim().toLowerCase().replace(/['']/g, '');
  const aliases: Record<string, string> = {
    'labor day': 'Labor Day',
    'mothers day': "Mother's Day",
    "mother's day": "Mother's Day",
    'fathers day': "Father's Day",
    "father's day": "Father's Day",
    'memorial day': 'Memorial Day',
    'independence day': 'Independence Day',
    'july 4th': 'Independence Day',
    'july 4': 'Independence Day',
    christmas: 'Christmas Day',
    thanksgiving: 'Thanksgiving',
    'new years day': "New Year's Day",
    "new year's day": "New Year's Day",
    juneteenth: 'Juneteenth',
    'veterans day': 'Veterans Day',
    "mlk day": 'Martin Luther King Jr. Day',
    'martin luther king day': 'Martin Luther King Jr. Day',
  };
  const canonical = aliases[normalized] ?? name;
  const todayKey = formatYmd(today);
  for (let y = today.getFullYear(); y <= today.getFullYear() + yearsAhead; y++) {
    const hit = usHolidaysForYear(y).find(
      (h) => h.name.toLowerCase().replace(/['']/g, '') === canonical.toLowerCase().replace(/['']/g, '')
    );
    if (hit && hit.date >= todayKey) return hit.date;
  }
  return null;
}

/** Upcoming Sat–Sun from today (if today is Sat/Sun, that weekend). */
export function upcomingWeekendDates(today: Date): string[] {
  const day = today.getDay(); // 0 Sun .. 6 Sat
  const saturday = new Date(today);
  if (day === 6) {
    // today Saturday
  } else if (day === 0) {
    saturday.setDate(today.getDate() - 1);
  } else {
    saturday.setDate(today.getDate() + (6 - day));
  }
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  return [formatYmd(saturday), formatYmd(sunday)];
}
