do $$
declare
  bucket_exists boolean;
  policy_name text;
begin
  select exists (
    select 1
    from storage.buckets
    where id = 'project-photos'
  ) into bucket_exists;

  if not bucket_exists then
    raise exception 'Storage bucket not found: project-photos';
  end if;

  update storage.buckets
  set public = false
  where id = 'project-photos';

  for policy_name in
    select pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'storage'
      and cls.relname = 'objects'
      and (
        pol.polname ilike '%project%photo%'
        or pg_get_expr(pol.polqual, pol.polrelid) ilike '%project-photos%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) ilike '%project-photos%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;
end
$$;

create policy "Users can view their own project photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their own project photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own project photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own project photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
