import type { AvailabilityNlPatch } from '@/utils/availabilityNlApi';

export interface TeamMemberAvailabilityShape {
  id: string;
  name: string;
  type?: string;
  weekendsOnly: boolean;
  weekdaysAfterFivePm: boolean;
  workingHours: { start: string; end: string };
  availability: {
    [date: string]: { start: string; end: string; available: boolean }[];
  };
  blackoutDates?: string[];
}

export interface ContractorAvailabilityShape {
  id: string;
  name: string;
  weekendsOnly: boolean;
  weekdaysAfterFivePm: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  availabilityDates: { [date: string]: unknown };
  notAvailableDates?: string[];
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

export function matchTeamMemberId(
  patch: AvailabilityNlPatch,
  team: TeamMemberAvailabilityShape[]
): string | null {
  if (patch.target.id && team.some((m) => m.id === patch.target.id)) {
    return patch.target.id;
  }
  const hint = patch.target.nameHint ? normalizeName(patch.target.nameHint) : '';
  if (hint) {
    const byName = team.find((m) => normalizeName(m.name) === hint || normalizeName(m.name).includes(hint));
    if (byName) return byName.id;
  }
  if (patch.target.kind === 'team_member') {
    const owner = team.find((m) => m.type === 'owner');
    if (owner) return owner.id;
    return team[0]?.id ?? null;
  }
  return null;
}

export function matchContractorId(
  patch: AvailabilityNlPatch,
  contractors: { id: string; name: string }[]
): string | null {
  if (patch.target.id && contractors.some((c) => c.id === patch.target.id)) {
    return patch.target.id;
  }
  const hint = patch.target.nameHint ? normalizeName(patch.target.nameHint) : '';
  if (!hint) return null;
  const hit = contractors.find(
    (c) => normalizeName(c.name) === hint || normalizeName(c.name).includes(hint) || hint.includes(normalizeName(c.name))
  );
  return hit?.id ?? null;
}

export function applyTeamMemberPatches(
  team: TeamMemberAvailabilityShape[],
  patches: AvailabilityNlPatch[]
): { next: TeamMemberAvailabilityShape[]; summary: string[]; unresolved: string[] } {
  const next = team.map((m) => ({
    ...m,
    availability: { ...m.availability },
    blackoutDates: [...(m.blackoutDates ?? [])],
    workingHours: { ...m.workingHours },
  }));
  const summary: string[] = [];
  const unresolved: string[] = [];

  for (const patch of patches.filter((p) => p.target.kind === 'team_member')) {
    const id = matchTeamMemberId(patch, next);
    if (!id) {
      unresolved.push(patch.target.nameHint || 'unknown team member');
      continue;
    }
    const idx = next.findIndex((m) => m.id === id);
    if (idx < 0) continue;
    const member = next[idx];

    member.weekendsOnly = patch.weekendsOnly;
    member.weekdaysAfterFivePm = patch.weekdaysAfterFivePm;
    member.workingHours = {
      start: patch.workingHours.start,
      end: patch.workingHours.end,
    };

    for (const slot of patch.availableSlots) {
      member.availability[slot.date] = [
        { start: slot.start, end: slot.end, available: true },
      ];
    }

    const blackoutSet = new Set([...(member.blackoutDates ?? []), ...patch.blackoutDates]);
    member.blackoutDates = [...blackoutSet].sort();

    const bits: string[] = [member.name];
    if (patch.weekdaysAfterFivePm) bits.push('evenings after 5pm');
    if (patch.weekendsOnly) bits.push('weekends only');
    if (patch.blackoutDates.length) bits.push(`off ${patch.blackoutDates.join(', ')}`);
    if (patch.availableSlots.length) bits.push(`${patch.availableSlots.length} dated slots`);
    summary.push(bits.join(' — '));
  }

  return { next, summary, unresolved };
}

export function applyContractorPatches<T extends ContractorAvailabilityShape>(
  contractors: T[],
  patches: AvailabilityNlPatch[]
): { next: T[]; summary: string[]; unresolved: string[] } {
  const next = contractors.map((c) => ({
    ...c,
    availabilityDates: { ...(c.availabilityDates || {}) },
    notAvailableDates: [...(c.notAvailableDates ?? [])],
  }));
  const summary: string[] = [];
  const unresolved: string[] = [];

  for (const patch of patches.filter((p) => p.target.kind === 'contractor')) {
    const id = matchContractorId(patch, next);
    if (!id) {
      unresolved.push(patch.target.nameHint || 'unknown contractor');
      continue;
    }
    const idx = next.findIndex((c) => c.id === id);
    if (idx < 0) continue;
    const c = next[idx];

    c.weekendsOnly = patch.weekendsOnly;
    c.weekdaysAfterFivePm = patch.weekdaysAfterFivePm;
    c.workingHoursStart = patch.workingHours.start;
    c.workingHoursEnd = patch.workingHours.end;

    for (const slot of patch.availableSlots) {
      c.availabilityDates[slot.date] = [{ start: slot.start, end: slot.end, available: true }];
    }

    const blackouts = new Set([...(c.notAvailableDates ?? []), ...patch.blackoutDates]);
    c.notAvailableDates = [...blackouts].sort();
    // Mirror into availability_dates under a reserved key for persistence
    (c.availabilityDates as Record<string, unknown>).__blackoutDates = c.notAvailableDates;

    summary.push(
      `${c.name} — ${patch.weekdaysAfterFivePm ? 'evenings' : patch.weekendsOnly ? 'weekends' : 'custom'}${
        patch.blackoutDates.length ? `; off ${patch.blackoutDates.join(', ')}` : ''
      }`
    );
  }

  return { next, summary, unresolved };
}
