import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// deno-lint-ignore no-explicit-any
type AdminClient = ReturnType<typeof createClient<any>>;

/**
 * Paying member, active trial, admin, or public beta may use paid AI features.
 */
export async function hasPaidEntitlement(
  admin: AdminClient,
  userId: string,
): Promise<boolean> {
  try {
    const { data: betaSetting } = await admin
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'beta_mode')
      .maybeSingle();
    if ((betaSetting?.setting_value as { enabled?: boolean } | null)?.enabled === true) {
      return true;
    }

    const { data: profile } = await admin
      .from('user_profiles')
      .select('roles')
      .eq('user_id', userId)
      .maybeSingle();
    const roles = Array.isArray(profile?.roles) ? profile.roles : [];
    if (roles.includes('admin') || roles.includes('project_owner')) return true;

    const { data: membership } = await admin
      .from('membership_status')
      .select('member_status, membership_end_date, trial_end_date')
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership) return false;

    const now = Date.now();
    const membershipActive =
      membership.member_status === true &&
      (!membership.membership_end_date ||
        new Date(membership.membership_end_date).getTime() >= now);
    const trialActive =
      !!membership.trial_end_date &&
      new Date(membership.trial_end_date).getTime() > now;

    return membershipActive || trialActive;
  } catch (error) {
    console.error('entitlement check failed');
    return false;
  }
}

/**
 * Per-user rate limit via check_rate_limit RPC. Fails closed on error.
 */
export async function assertUserRateLimit(
  admin: AdminClient,
  userId: string,
  bucket: string,
  maxAttempts = 30,
  windowMinutes = 60,
): Promise<{ allowed: boolean }> {
  const { data: isAllowed, error } = await admin.rpc('check_rate_limit', {
    identifier: `${bucket}:${userId}`,
    max_attempts: maxAttempts,
    window_minutes: windowMinutes,
  });

  if (error) {
    console.error('rate limit check failed', error.message);
    return { allowed: false };
  }

  return { allowed: isAllowed === true };
}

export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
