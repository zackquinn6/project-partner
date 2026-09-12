/**
 * Offline smoke checks for AI availability apply + holiday resolution.
 * Run: npx tsx scripts/smoke-availability-nl.ts
 */
import {
  applyContractorPatches,
  applyTeamMemberPatches,
} from '../src/utils/applyAvailabilityPatches';
import { buildWorkerTimeSlots } from '../src/utils/buildWorkerAvailability';
import {
  formatYmd,
  laborDay,
  mothersDay,
  resolveHolidayName,
  upcomingWeekendDates,
  usHolidaysInRange,
} from '../src/utils/usHolidays';
import type { AvailabilityNlPatch } from '../src/utils/availabilityNlApi';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const today = new Date(2026, 8, 11); // Fri Sep 11, 2026
assert(formatYmd(laborDay(2026)) === '2026-09-07', 'Labor Day 2026');
assert(formatYmd(mothersDay(2026)) === '2026-05-10', 'Mother Day 2026');
assert(resolveHolidayName('Labor Day', today) === '2027-09-06', 'next Labor Day after Sep 11');
assert(upcomingWeekendDates(today).join(',') === '2026-09-12,2026-09-13', 'upcoming weekend');

const team = [
  {
    id: '1',
    name: 'You',
    type: 'owner',
    weekendsOnly: false,
    weekdaysAfterFivePm: false,
    workingHours: { start: '09:00', end: '17:00' },
    availability: {},
    blackoutDates: [] as string[],
  },
];

const vacationPatch: AvailabilityNlPatch = {
  target: { kind: 'team_member', id: '1', nameHint: 'You' },
  weekendsOnly: false,
  weekdaysAfterFivePm: true,
  workingHours: { start: '17:00', end: '21:00' },
  availableSlots: [
    { date: '2026-09-14', start: '17:00', end: '21:00' },
    { date: '2026-09-15', start: '17:00', end: '21:00' },
    { date: '2026-09-16', start: '17:00', end: '21:00' },
    { date: '2026-09-17', start: '17:00', end: '21:00' },
  ],
  blackoutDates: ['2026-09-12', '2026-09-13', '2027-09-06', '2027-05-09'],
  notes: null,
};

const applied = applyTeamMemberPatches(team, [vacationPatch]);
assert(applied.unresolved.length === 0, 'team resolved');
assert(applied.next[0].weekdaysAfterFivePm === true, 'evenings flag');
assert(applied.next[0].blackoutDates?.includes('2026-09-12') === true, 'weekend blackout');
assert(Object.keys(applied.next[0].availability).length === 4, 'mon-thu slots');

const rangeStart = new Date(2026, 8, 11);
const rangeEnd = new Date(2026, 8, 20);
const slots = buildWorkerTimeSlots(applied.next[0], rangeStart, rangeEnd, []);
assert(
  !slots.some((s) => formatYmd(s.start) === '2026-09-12'),
  'engine slots skip vacation Saturday'
);
assert(
  slots.some((s) => formatYmd(s.start) === '2026-09-14' && s.start.getHours() === 17),
  'Mon after 5 present'
);

const holidays = usHolidaysInRange(new Date(2026, 8, 1), new Date(2026, 8, 30));
assert(holidays.some((h) => h.name === 'Labor Day'), 'Labor Day in September window');

const contractors = [
  {
    id: 'c1',
    name: 'Mike',
    weekendsOnly: false,
    weekdaysAfterFivePm: false,
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    availabilityDates: {},
    notAvailableDates: [] as string[],
  },
];
const contractorPatch: AvailabilityNlPatch = {
  target: { kind: 'contractor', id: null, nameHint: 'Mike the tiler' },
  weekendsOnly: true,
  weekdaysAfterFivePm: false,
  workingHours: { start: '08:00', end: '14:00' },
  availableSlots: [{ date: '2026-09-12', start: '08:00', end: '14:00' }],
  blackoutDates: [],
  notes: null,
};
const cApplied = applyContractorPatches(contractors, [contractorPatch]);
assert(cApplied.unresolved.length === 0, 'contractor matched');
assert(cApplied.next[0].weekendsOnly === true, 'contractor weekends');
assert(cApplied.next[0].workingHoursEnd === '14:00', 'contractor end 2pm');

console.log('smoke-availability-nl: OK');
