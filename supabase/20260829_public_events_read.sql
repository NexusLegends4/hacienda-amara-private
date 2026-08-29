-- Let visitors browse published event information without an account.
alter table public.events enable row level security;

drop policy if exists "Public can view events" on public.events;
create policy "Public can view events"
  on public.events
  for select
  to anon, authenticated
  using (true);

grant select on table public.events to anon, authenticated;
