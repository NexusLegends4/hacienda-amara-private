-- Prevent overlapping guest bookings for the same resort schedule.
-- Run after 20260829_guest_reservations.sql and 20260908_guest_reservation_cancellation.sql.

drop function if exists public.get_reserved_date_ranges();
create or replace function public.get_reserved_date_ranges()
returns table (check_in date, check_out date, room_type text)
language sql
security definer
set search_path = public
as $$
  select r.check_in, r.check_out, r.room_type
  from public.reservations r
  where r.status <> 'cancelled';
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
begin
  if reservation_room_type not in ('Day Time (9 Hours)', 'Night Time (9 Hours)', 'Overnight (21 Hours)') then
    raise exception 'Invalid reservation package.';
  end if;

  if reservation_room_type = 'Day Time (9 Hours)' then
    requested_start := reservation_check_in + time '09:00';
    requested_end := reservation_check_in + time '18:00';
  elsif reservation_room_type = 'Night Time (9 Hours)' then
    requested_start := reservation_check_in + time '21:00';
    requested_end := reservation_check_out + time '06:00';
  else
    requested_start := reservation_check_in + time '09:00';
    requested_end := reservation_check_out + time '06:00';
  end if;

  -- Serialize booking attempts so two simultaneous requests cannot both pass.
  perform pg_advisory_xact_lock(hashtext('hacienda-reservation-slots'));

  for existing_booking in
    select * from public.reservations
    where status <> 'cancelled'
  loop
    if existing_booking.room_type = 'Day Time (9 Hours)' then
      existing_start := existing_booking.check_in + time '09:00';
      existing_end := existing_booking.check_in + time '18:00';
    elsif existing_booking.room_type = 'Night Time (9 Hours)' then
      existing_start := existing_booking.check_in + time '21:00';
      existing_end := existing_booking.check_out + time '06:00';
    else
      existing_start := existing_booking.check_in + time '09:00';
      existing_end := existing_booking.check_out + time '06:00';
    end if;

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

  return new_id;
end;
$$;

revoke all on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) from public;
grant execute on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) to anon, authenticated;