import type { TimeSlot, Worker } from '@/interfaces/Scheduling';
import { formatYmd } from '@/utils/usHolidays';

export interface SchedulerTeamMemberAvailability {
  id: string;
  weekendsOnly?: boolean;
  weekdaysAfterFivePm?: boolean;
  workingHours?: { start: string; end: string };
  availability?: {
    [date: string]: { start: string; end: string; available: boolean }[];
  };
  blackoutDates?: string[];
}

function parseHm(hm: string, onDay: Date): Date {
  const [h, m] = hm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(onDay);
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function dayMatchesPattern(date: Date, member: SchedulerTeamMemberAvailability): boolean {
  const dow = date.getDay(); // 0 Sun .. 6 Sat
  const isWeekend = dow === 0 || dow === 6;
  if (member.weekendsOnly) return isWeekend;
  // Weekday evening / full-time patterns: weekdays only
  return !isWeekend;
}

/**
 * Expand a team member's flags + specific slots into engine TimeSlots for [rangeStart, rangeEnd].
 */
export function buildWorkerTimeSlots(
  member: SchedulerTeamMemberAvailability,
  rangeStart: Date,
  rangeEnd: Date,
  extraBlackouts: string[] = []
): TimeSlot[] {
  const blackout = new Set<string>([
    ...(member.blackoutDates ?? []),
    ...extraBlackouts,
  ]);
  const specific = member.availability ?? {};
  const hasSpecific = Object.keys(specific).length > 0;
  const hours = member.workingHours ?? { start: '09:00', end: '17:00' };
  const slots: TimeSlot[] = [];

  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(23, 59, 59, 999);

  while (cursor <= end) {
    const key = formatYmd(cursor);
    if (blackout.has(key)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const daySlots = specific[key];
    if (daySlots && daySlots.length > 0) {
      for (const s of daySlots) {
        if (s.available === false) continue;
        slots.push({
          start: parseHm(s.start || hours.start, cursor),
          end: parseHm(s.end || hours.end, cursor),
          workerId: member.id,
          isAvailable: true,
        });
      }
    } else if (!hasSpecific && dayMatchesPattern(cursor, member)) {
      slots.push({
        start: parseHm(hours.start, cursor),
        end: parseHm(hours.end, cursor),
        workerId: member.id,
        isAvailable: true,
      });
    } else if (hasSpecific) {
      // Specific-date mode: only listed dates (already handled). Skip other days.
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

export function collectMemberBlackoutDates(
  members: Array<{ blackoutDates?: string[] }>
): string[] {
  const set = new Set<string>();
  for (const m of members) {
    for (const d of m.blackoutDates ?? []) set.add(d);
  }
  return [...set].sort();
}

export function toEngineWorker(
  member: SchedulerTeamMemberAvailability,
  rangeStart: Date,
  rangeEnd: Date,
  globalBlackouts: string[]
): Worker {
  return {
    id: member.id,
    name: (member as { name?: string }).name || member.id,
    type: ((member as { type?: string }).type as Worker['type']) || 'owner',
    skillLevel: (member as { skillLevel?: string }).skillLevel || 'intermediate',
    weekendsOnly: member.weekendsOnly,
    weekdaysAfterFivePm: member.weekdaysAfterFivePm,
    workingHours: member.workingHours,
    availability: buildWorkerTimeSlots(member, rangeStart, rangeEnd, globalBlackouts),
  };
}
