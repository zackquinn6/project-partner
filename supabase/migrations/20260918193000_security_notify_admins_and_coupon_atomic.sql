-- Restrict admin notification helper to service_role only.
-- Authenticated clients must call the report-runtime-error Edge Function instead.

revoke execute on function public.notifications_notify_admins(text, text, text, jsonb) from authenticated;
revoke execute on function public.notifications_notify_admins(text, text, text, jsonb) from public;
grant execute on function public.notifications_notify_admins(text, text, text, jsonb) to service_role;

-- Atomic coupon redemption: increment only while under max_uses (NULL max = unlimited).
create or replace function public.redeem_coupon_increment(p_coupon_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  updated_id uuid;
begin
  update public.coupon_codes
  set times_used = times_used + 1
  where id = p_coupon_id
    and active = true
    and (max_uses is null or times_used < max_uses)
  returning id into updated_id;

  return updated_id is not null;
end;
$function$;

revoke all on function public.redeem_coupon_increment(uuid) from public;
grant execute on function public.redeem_coupon_increment(uuid) to service_role;
