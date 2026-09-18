create extension if not exists pgcrypto;

create table if not exists public.reservation_access_tokens (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  token_hash bigint not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists reservation_access_tokens_expires_at_idx
  on public.reservation_access_tokens (expires_at);

create index if not exists reservation_access_tokens_reservation_id_idx
  on public.reservation_access_tokens (reservation_id);

create index if not exists reservations_guest_lookup_idx
  on public.reservations (guest_email, guest_phone, check_in);

alter table public.reservation_access_tokens enable row level security;

revoke all on table public.reservation_access_tokens from public;

-- Backfill access links and notification records for reservations created before
-- this migration was installed.
insert into public.reservation_access_tokens (reservation_id, token_hash, expires_at)
select
  reservation.id,
  hashtextextended(gen_random_uuid()::text, 0),
  now() + interval '90 days'
from public.reservations reservation
where reservation.profile_id is null
  and not exists (
    select 1
    from public.reservation_access_tokens access_token
    where access_token.reservation_id = reservation.id
  );

insert into public.guest_reservation_notifications (
  reservation_id,
  recipient_name,
  recipient_email,
  message,
  status,
  room_type,
  check_in
)
select
  reservation.id,
  coalesce(nullif(trim(reservation.guest_name), ''), 'Guest'),
  reservation.guest_email,
  'Your reservation has been submitted and is pending staff review.',
  reservation.status,
  reservation.room_type,
  reservation.check_in
from public.reservations reservation
where reservation.profile_id is null
  and reservation.status in ('pending', 'confirmed')
on conflict (reservation_id, status) do nothing;

create table if not exists public.guest_reservation_notifications (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  recipient_name text not null,
  recipient_email text not null,
  message text not null,
  status text not null check (status in ('pending', 'confirmed', 'cancelled')),
  room_type text not null,
  check_in date not null,
  created_at timestamptz not null default now(),
  constraint guest_reservation_notifications_reservation_status_key unique (reservation_id, status)
);

alter table public.guest_reservation_notifications enable row level security;

revoke all on table public.guest_reservation_notifications from public;

create or replace function public.create_guest_reservation(
  reservation_guest_name text,
  reservation_guest_email text,
  reservation_guest_phone text,
  reservation_check_in date,
  reservation_check_out date,
  reservation_room_type text,
  reservation_guests integer,
  reservation_total_price numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  access_token uuid;
  requested_start timestamp;
  requested_end timestamp;
  existing_start timestamp;
  existing_end timestamp;
  existing_booking record;
  pkg record;
begin
  select * into pkg
  from public.packages
  where name = reservation_room_type and is_active = true;

  if pkg is null then
    raise exception 'Invalid or inactive reservation package.';
  end if;

  requested_start := reservation_check_in + pkg.check_in_time;
  requested_end := reservation_check_out + pkg.check_out_time;

  perform pg_advisory_xact_lock(hashtext('hacienda-reservation-slots'));

  for existing_booking in
    select r.*, p.check_in_time, p.check_out_time
    from public.reservations r
    join public.packages p on p.name = r.room_type
    where r.status <> 'cancelled'
  loop
    existing_start := existing_booking.check_in + existing_booking.check_in_time;
    existing_end := existing_booking.check_out + existing_booking.check_out_time;

    if requested_start < existing_end and requested_end > existing_start then
      return null;
    end if;
  end loop;

  insert into public.reservations (
    profile_id, guest_name, guest_email, guest_phone, check_in, check_out,
    room_type, guests, total_price, status
  ) values (
    null, trim(reservation_guest_name), trim(reservation_guest_email),
    trim(reservation_guest_phone), reservation_check_in, reservation_check_out,
    reservation_room_type, reservation_guests, reservation_total_price, 'pending'
  ) returning id into new_id;

  access_token := gen_random_uuid();

  insert into public.reservation_access_tokens (reservation_id, token_hash, expires_at)
  values (
    new_id,
    hashtextextended(access_token::text, 0),
    now() + interval '90 days'
  )
  on conflict (reservation_id) do update
    set token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at
  returning id into access_token;

  insert into public.guest_reservation_notifications (
    reservation_id,
    recipient_name,
    recipient_email,
    message,
    status,
    room_type,
    check_in
  ) values (
    new_id,
    trim(reservation_guest_name),
    trim(reservation_guest_email),
    'Your reservation has been submitted and is pending staff review.',
    'pending',
    reservation_room_type,
    reservation_check_in
  )
  on conflict (reservation_id, status) do update
    set recipient_name = excluded.recipient_name,
        recipient_email = excluded.recipient_email,
        message = excluded.message,
        room_type = excluded.room_type,
        check_in = excluded.check_in,
        created_at = excluded.created_at;

  return access_token;
end;
$$;

revoke all on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) from public;
grant execute on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) to anon;

create or replace function public.get_guest_reservation_notification(reservation_token uuid)
returns table (
  guest_name text,
  room_type text,
  check_in date,
  status text,
  message text,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    n.recipient_name as guest_name,
    n.room_type,
    n.check_in,
    n.status,
    n.message,
    r.created_at
  from public.guest_reservation_notifications n
  join public.reservation_access_tokens access_token
    on access_token.reservation_id = n.reservation_id
  join public.reservations r
    on r.id = n.reservation_id
  where access_token.token_hash = hashtextextended(reservation_token::text, 0)
    and access_token.expires_at > now()
  order by r.created_at desc
  limit 1;
$$;

revoke all on function public.get_guest_reservation_notification(uuid) from public;
grant execute on function public.get_guest_reservation_notification(uuid) to anon;

drop function if exists public.find_guest_reservation(text, text, date);

create or replace function public.find_guest_reservation(
  reservation_email text,
  reservation_phone text,
  reservation_check_in date
)
returns table (
  reservation_token uuid,
  guest_name text,
  room_type text,
  check_in date,
  status text,
  message text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    access_token.id as reservation_token,
    notification.recipient_name as guest_name,
    notification.room_type,
    notification.check_in,
    notification.status,
    notification.message
  from public.reservations reservation
  join public.reservation_access_tokens access_token
    on access_token.reservation_id = reservation.id
  join public.guest_reservation_notifications notification
    on notification.reservation_id = reservation.id
   and notification.status = reservation.status
  where lower(reservation.guest_email) = lower(trim(reservation_email))
    and trim(reservation.guest_phone) = trim(reservation_phone)
    and reservation.check_in = reservation_check_in
    and access_token.expires_at > now()
  order by reservation.created_at desc
  limit 1;
$$;

revoke all on function public.find_guest_reservation(text, text, date) from public;
grant execute on function public.find_guest_reservation(text, text, date) to anon;
