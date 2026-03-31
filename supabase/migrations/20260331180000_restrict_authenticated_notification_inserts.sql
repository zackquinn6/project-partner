drop policy if exists "Allow insert notifications" on public.notifications;

create policy "Allow insert notifications"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid());
