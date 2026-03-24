import { supabase } from '@/integrations/supabase/client';

const ensurePromises = new Map<string, Promise<void>>();

/**
 * Ensures the signed-in user has at least one home (primary "My Home" + home_details row).
 * Safe to call on every session; deduped per user while in flight.
 */
export async function ensureDefaultHomeForUser(userId: string): Promise<void> {
  const existing = ensurePromises.get(userId);
  if (existing) return existing;

  const p = (async () => {
    const { count, error: countError } = await supabase
      .from('homes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;
    if (count !== null && count > 0) return;

    const { data: newHome, error: insertError } = await supabase
      .from('homes')
      .insert({ user_id: userId, name: 'My Home', is_primary: true })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const { error: detailsError } = await supabase
      .from('home_details')
      .insert({ home_id: newHome.id, home_ownership: 'own' });

    if (detailsError) throw detailsError;
  })().finally(() => {
    ensurePromises.delete(userId);
  });

  ensurePromises.set(userId, p);
  return p;
}

/**
 * After {@link ensureDefaultHomeForUser}, returns primary home id when marked, else first row by sort order.
 */
export async function getDefaultHomeIdForUser(userId: string): Promise<string> {
  await ensureDefaultHomeForUser(userId);
  const { data, error } = await supabase
    .from('homes')
    .select('id')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Expected a home row after ensureDefaultHomeForUser');
  return data.id;
}
