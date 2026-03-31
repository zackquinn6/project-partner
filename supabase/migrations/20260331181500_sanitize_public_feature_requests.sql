drop policy if exists "Public can view feature requests" on public.feature_requests;
drop policy if exists "Authenticated users can view feature requests" on public.feature_requests;
drop policy if exists "Admins can view feature requests" on public.feature_requests;

create policy "Admins can view feature requests"
on public.feature_requests
for select
to authenticated
using (public.is_admin(auth.uid()));

drop view if exists public.feature_requests_public;

create view public.feature_requests_public as
select
  id,
  title,
  description,
  category,
  priority_request,
  status,
  votes,
  created_at,
  admin_response,
  submitted_by,
  roadmap_item_id,
  updated_at
from public.feature_requests;

grant select on public.feature_requests_public to anon;
grant select on public.feature_requests_public to authenticated;
