-- Allow guests to sign in to an event without creating or logging into an account.
alter table public.registrations
  alter column profile_id drop not null,
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

alter table public.registrations
  drop constraint if exists registrations_guest_contact_check;
alter table public.registrations
  add constraint registrations_guest_contact_check check (
    profile_id is not null
    or (
      length(trim(coalesce(guest_name, ''))) >= 2
      and guest_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
      and length(trim(coalesce(guest_phone, ''))) >= 7
    )
  );

create unique index if not exists registrations_guest_event_email_key
  on public.registrations (event_id, lower(guest_email))
  where profile_id is null;

drop policy if exists "Guests can sign in to events" on public.registrations;
create policy "Guests can sign in to events"
  on public.registrations
  for insert to anon, authenticated
  with check (
    profile_id is null
    and length(trim(coalesce(guest_name, ''))) >= 2
    and guest_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    and length(trim(coalesce(guest_phone, ''))) >= 7
  );

drop policy if exists "Admins can view event attendance" on public.registrations;
create policy "Admins can view event attendance"
  on public.registrations
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
