-- Route runtime / function failures to platform admins' notification panes.
-- Authenticated clients cannot insert notifications for other users (RLS), so this
-- security definer helper inserts one row per admin profile.

create or replace function public.notifications_notify_admins(
  p_type text,
  p_title text,
  p_body text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_admin record;
  v_metadata jsonb;
begin
  if auth.uid() is null then
    return;
  end if;

  if p_type is null or length(trim(p_type)) = 0 then
    raise exception 'notification type is required';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'notification title is required';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb)
    || jsonb_build_object('affected_user_id', auth.uid());

  for v_admin in
    select up.user_id
    from public.user_profiles up
    where 'admin' = any (coalesce(up.roles, array[]::text[]))
  loop
    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_admin.user_id,
      p_type,
      p_title,
      coalesce(p_body, ''),
      v_metadata
    );
  end loop;
end;
$function$;

revoke all on function public.notifications_notify_admins(text, text, text, jsonb) from public;
grant execute on function public.notifications_notify_admins(text, text, text, jsonb) to authenticated;
grant execute on function public.notifications_notify_admins(text, text, text, jsonb) to service_role;
