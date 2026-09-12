import { supabase } from '@/integrations/supabase/client';
import type { ContractorAvailabilityShape } from '@/utils/applyAvailabilityPatches';

/** Persist AI-applied contractor availability fields to user_contractors. */
export async function persistContractorAvailabilityPatches(
  contractors: ContractorAvailabilityShape[]
): Promise<void> {
  for (const c of contractors) {
    const rowId = (c as { dbId?: string }).dbId || c.id;
    if (!rowId) continue;

    const availabilityDates = {
      ...(c.availabilityDates || {}),
      __blackoutDates: c.notAvailableDates ?? [],
    };

    const { error } = await supabase
      .from('user_contractors' as 'user_contractors')
      .update({
        weekends_only: c.weekendsOnly,
        weekdays_after_five_pm: c.weekdaysAfterFivePm,
        working_hours_start: c.workingHoursStart,
        working_hours_end: c.workingHoursEnd,
        availability_dates: availabilityDates,
      } as never)
      .eq('id', rowId);

    if (error) {
      console.error('persistContractorAvailabilityPatches:', error);
      throw error;
    }
  }
}

export async function loadContractorAvailabilityRoster(userId: string): Promise<
  (ContractorAvailabilityShape & { dbId?: string })[]
> {
  const { data, error } = await supabase
    .from('user_contractors' as 'user_contractors')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('loadContractorAvailabilityRoster:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const dates = (row.availability_dates as Record<string, unknown>) || {};
    const blackouts = Array.isArray(dates.__blackoutDates)
      ? (dates.__blackoutDates as string[])
      : [];
    return {
      id: String(row.id),
      dbId: String(row.id),
      name: String(row.name ?? ''),
      weekendsOnly: Boolean(row.weekends_only),
      weekdaysAfterFivePm: Boolean(row.weekdays_after_five_pm),
      workingHoursStart: String(row.working_hours_start || '08:00'),
      workingHoursEnd: String(row.working_hours_end || '17:00'),
      availabilityDates: dates,
      notAvailableDates: blackouts,
    };
  });
}
