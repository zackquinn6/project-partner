-- pfmea_requirements policies called can_caller_edit_project(), which has EXECUTE revoked from
-- authenticated, so every client read failed with 42501. The same ownership test is inlined here
-- so the policies need no function grant.
--
-- Edit rights: platform admin, the project's own user_id, or an accepted co-owner in
-- project_owners. A project_owners row is an accepted co-owner only when invitation_status is
-- null; a non-null status is a pending or expired invitation and carries no access.

drop policy if exists pfmea_requirements_select_editors on public.pfmea_requirements;
drop policy if exists pfmea_requirements_insert_editors on public.pfmea_requirements;
drop policy if exists pfmea_requirements_update_editors on public.pfmea_requirements;
drop policy if exists pfmea_requirements_delete_editors on public.pfmea_requirements;

alter table public.pfmea_requirements enable row level security;

create policy pfmea_requirements_select_editors
  on public.pfmea_requirements
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pfmea_requirements.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_owners po
      where po.project_id = pfmea_requirements.project_id
        and po.user_id = auth.uid()
        and po.invitation_status is null
    )
  );

create policy pfmea_requirements_insert_editors
  on public.pfmea_requirements
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pfmea_requirements.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_owners po
      where po.project_id = pfmea_requirements.project_id
        and po.user_id = auth.uid()
        and po.invitation_status is null
    )
  );

create policy pfmea_requirements_update_editors
  on public.pfmea_requirements
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pfmea_requirements.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_owners po
      where po.project_id = pfmea_requirements.project_id
        and po.user_id = auth.uid()
        and po.invitation_status is null
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pfmea_requirements.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_owners po
      where po.project_id = pfmea_requirements.project_id
        and po.user_id = auth.uid()
        and po.invitation_status is null
    )
  );

create policy pfmea_requirements_delete_editors
  on public.pfmea_requirements
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = pfmea_requirements.project_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_owners po
      where po.project_id = pfmea_requirements.project_id
        and po.user_id = auth.uid()
        and po.invitation_status is null
    )
  );
