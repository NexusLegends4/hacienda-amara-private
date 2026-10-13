-- Add a distinct denied status for reservation requests.
do $$
declare
  status_constraint record;
begin
  for status_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format(
      'alter table public.reservations drop constraint %I',
      status_constraint.conname
    );
  end loop;
end $$;

alter table public.reservations
  add constraint reservations_status_check
  check (status in ('pending', 'confirmed', 'denied', 'cancelled'));

alter table public.guest_reservation_notifications
  drop constraint if exists guest_reservation_notifications_status_check;

alter table public.guest_reservation_notifications
  add constraint guest_reservation_notifications_status_check
  check (status in ('pending', 'confirmed', 'denied', 'cancelled'));

create or replace function public.on_reservation_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  handler_name text;
  customer_name text;
  booking_label text;
  guest_message text;
begin
  if old.status is not distinct from new.status
    or new.status not in ('confirmed', 'denied', 'cancelled') then
    return new;
  end if;

  booking_label := coalesce(nullif(new.room_type, ''), 'your reservation')
    || ' on '
    || coalesce(new.check_in::text, 'the selected date');

  if new.profile_id is not null then
    select trim(concat_ws(' ', firstname, lastname))
      into handler_name
      from public.profiles
      where id = auth.uid();

    select trim(concat_ws(' ', firstname, lastname))
      into customer_name
      from public.profiles
      where id = new.profile_id;

    insert into public.notifications (profile_id, message, type)
    values (
      new.profile_id,
      case new.status
        when 'confirmed' then
          coalesce(nullif(handler_name, ''), 'Admin or staff')
          || ' accepted '
          || coalesce(nullif(customer_name, ''), 'your booking')
          || '''s booking for '
          || booking_label
          || '.'
        when 'denied' then
          coalesce(nullif(handler_name, ''), 'Admin or staff')
          || ' denied '
          || coalesce(nullif(customer_name, ''), 'your booking')
          || '''s request for '
          || booking_label
          || '.'
        when 'cancelled' then
          coalesce(nullif(handler_name, ''), 'Admin or staff')
          || ' cancelled '
          || coalesce(nullif(customer_name, ''), 'your booking')
          || '''s reservation for '
          || booking_label
          || '.'
      end,
      'reservation'
    );
  else
    customer_name := coalesce(nullif(new.guest_name, ''), 'Guest');
    guest_message := case new.status
      when 'confirmed' then
        'Good news! Your reservation for '
        || booking_label
        || ' has been accepted by Hacienda Amara.'
      when 'denied' then
        'Your reservation request for '
        || booking_label
        || ' was denied. Please contact Hacienda Amara for assistance.'
      when 'cancelled' then
        'Your reservation for '
        || booking_label
        || ' has been cancelled.'
    end;

    insert into public.guest_reservation_notifications (
      reservation_id,
      recipient_name,
      recipient_email,
      message,
      status,
      room_type,
      check_in
    ) values (
      new.id,
      customer_name,
      coalesce(new.guest_email, ''),
      guest_message,
      new.status,
      new.room_type,
      new.check_in
    )
    on conflict (reservation_id, status) do update
      set recipient_name = excluded.recipient_name,
          recipient_email = excluded.recipient_email,
          message = excluded.message,
          room_type = excluded.room_type,
          check_in = excluded.check_in,
          created_at = excluded.created_at;
  end if;

  return new;
end;
$$;

revoke all on function public.on_reservation_status_update() from public;

drop function if exists public.get_reserved_date_ranges();
create or replace function public.get_reserved_date_ranges()
returns table (check_in date, check_out date, room_type text)
language sql
security definer
set search_path = public
as $$
  select r.check_in, r.check_out, r.room_type
  from public.reservations r
  where r.status not in ('cancelled', 'denied');
$$;

revoke all on function public.get_reserved_date_ranges() from public;
grant execute on function public.get_reserved_date_ranges() to anon, authenticated;

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
    where r.status not in ('cancelled', 'denied')
  loop
    existing_start := existing_booking.check_in + existing_booking.check_in_time;
    existing_end := existing_booking.check_out + existing_booking.check_out_time;

    if requested_start < existing_end and requested_end > existing_start then
      return null;
    end if;
  end loop;

  insert into public.reservations (
    profile_id, guest_name, normalized_guest_email, normalized_guest_phone,
    guest_email, guest_phone, check_in, check_out,
    room_type, guests, total_price, status
  ) values (
    null, trim(reservation_guest_name), lower(trim(reservation_guest_email)),
    regexp_replace(reservation_guest_phone, '[^0-9]', '', 'g'),
    trim(reservation_guest_email), trim(reservation_guest_phone),
    reservation_check_in, reservation_check_out,
    reservation_room_type, reservation_guests, reservation_total_price, 'pending'
  ) returning id into new_id;

  insert into public.reservation_access_tokens (reservation_id, token_hash, expires_at)
  values (
    new_id,
    hashtextextended(new_id::text, 0),
    now() + interval '90 days'
  )
  on conflict (reservation_id) do update
    set token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        created_at = excluded.created_at;

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
        status = excluded.status,
        room_type = excluded.room_type,
        check_in = excluded.check_in,
        created_at = excluded.created_at;

  return new_id;
end;
$$;

revoke all on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) from public;
grant execute on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) to anon, authenticated;

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
    reservation.id as reservation_token,
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
  where reservation.normalized_guest_email = lower(trim(reservation_email))
    and reservation.normalized_guest_phone =
        regexp_replace(reservation_phone, '[^0-9]', '', 'g')
    and reservation.check_in = reservation_check_in
    and reservation.status in ('pending', 'confirmed', 'denied')
    and access_token.expires_at > now()
  order by reservation.created_at desc
  limit 1;
$$;

revoke all on function public.find_guest_reservation(text, text, date) from public;
grant execute on function public.find_guest_reservation(text, text, date) to anon, authenticated;
