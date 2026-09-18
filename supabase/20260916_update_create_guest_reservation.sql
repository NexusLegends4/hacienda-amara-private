-- Update create_guest_reservation to use packages table
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
  -- Validate package exists and is active
  select * into pkg
  from public.packages
  where name = reservation_room_type and is_active = true;

  if pkg is null then
    raise exception 'Invalid or inactive reservation package.';
  end if;

  -- Calculate time range based on package settings
  requested_start := reservation_check_in + pkg.check_in_time;
  requested_end := reservation_check_out + pkg.check_out_time;

  -- Serialize booking attempts so two simultaneous requests cannot both pass.
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

  return new_id;
end;
$$;

revoke all on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) from public;
grant execute on function public.create_guest_reservation(text, text, text, date, date, text, integer, numeric) to anon, authenticated;