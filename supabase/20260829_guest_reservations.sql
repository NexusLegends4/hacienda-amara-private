-- Allow visitors without an account to submit a reservation.
-- Run this migration in the Supabase SQL Editor before deploying the UI change.

alter table public.reservations
  alter column profile_id drop not null,
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

-- Existing account bookings can retain their profile data. New guest bookings
-- must include contact details so resort staff can respond to them.
alter table public.reservations
  drop constraint if exists reservations_guest_contact_check;

alter table public.reservations
  add constraint reservations_guest_contact_check check (
    profile_id is not null
    or (
      length(trim(coalesce(guest_name, ''))) >= 2
      and guest_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
      and length(trim(coalesce(guest_phone, ''))) >= 7
    )
  );

alter table public.auth_notifications
  drop constraint if exists auth_notifications_actor_role_check;
alter table public.auth_notifications
  add constraint auth_notifications_actor_role_check
  check (actor_role in ('admin', 'client', 'guest'));

drop policy if exists "Guests can create reservations" on public.reservations;
create policy "Guests can create reservations"
  on public.reservations
  for insert
  to anon, authenticated
  with check (
    profile_id is null
    and length(trim(coalesce(guest_name, ''))) >= 2
    and guest_email ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    and length(trim(coalesce(guest_phone, ''))) >= 7
  );

-- Guest bookings do not have a profile to receive an in-app status notification.
create or replace function public.on_reservation_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  handler_name text;
begin
  if old.status is not distinct from new.status or new.profile_id is null then
    return new;
  end if;

  select trim(concat_ws(' ', firstname, lastname))
    into handler_name
  from public.profiles
  where id = auth.uid();

  handler_name := coalesce(nullif(handler_name, ''), 'Admin');

  insert into public.notifications (profile_id, message, type)
  values (
    new.profile_id,
    case
      when new.status = 'confirmed' then handler_name || ' accepted your booking for ' || new.room_type || ' on ' || new.check_in || '.'
      when new.status = 'cancelled' then handler_name || ' rejected your booking for ' || new.room_type || ' on ' || new.check_in || '.'
      else 'Your reservation status has been updated to ' || new.status || ' for ' || new.room_type || ' on ' || new.check_in || '.'
    end,
    'reservation'
  );

  return new;
end;
$$;

-- Include guest contact data in the existing real-time admin activity feed.
create or replace function public.on_reservation_created_notify_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
  client_email text;
begin
  if new.profile_id is null then
    client_name := new.guest_name;
    client_email := new.guest_email;
  else
    select trim(concat_ws(' ', firstname, lastname)), email
      into client_name, client_email
    from public.profiles
    where id = new.profile_id;
  end if;

  insert into public.auth_notifications (event_type, actor_profile_id, actor_role, actor_name, actor_email)
  values (
    'booking',
    coalesce(new.profile_id::text, 'guest'),
    case when new.profile_id is null then 'guest' else 'client' end,
    coalesce(nullif(client_name, ''), coalesce(client_email, 'Guest')),
    coalesce(client_email, '')
  );

  return new;
end;
$$;
