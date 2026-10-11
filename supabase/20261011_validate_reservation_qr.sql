-- Booking validation for the staff/admin QR scanner.
-- Run in the Supabase SQL Editor (after 20260916_packages_table.sql and
-- 20260918_guest_reservation_notifications.sql).
--
-- Accepts either a reservation id or a guest access-token id (the value that
-- appears in /customer-notifications/<uuid>) and returns the reservation plus
-- a server-computed `validity`, using Philippine local time.
--
--   valid      confirmed and the booked window is open right now
--   not_yet    confirmed, but the window has not started
--   expired    confirmed, but the window has already ended
--   pending    still waiting for staff approval
--   cancelled  rejected or cancelled

create or replace function public.validate_reservation_qr(reservation_token uuid)
returns table (
  reservation_id uuid,
  guest_name text,
  guest_phone text,
  room_type text,
  check_in date,
  check_out date,
  guests integer,
  total_price numeric,
  status text,
  starts_at timestamp,
  ends_at timestamp,
  validity text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  local_now timestamp := (now() at time zone 'Asia/Manila');
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'staff')
  ) then
    raise exception 'Not authorized to validate reservations.' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    coalesce(nullif(trim(r.guest_name), ''),
             nullif(trim(concat_ws(' ', pr.firstname, pr.lastname)), ''),
             'Guest')::text,
    coalesce(r.guest_phone, '')::text,
    r.room_type::text,
    r.check_in,
    r.check_out,
    r.guests,
    r.total_price,
    r.status::text,
    (r.check_in + coalesce(pk.check_in_time, time '09:00'))::timestamp,
    (r.check_out + coalesce(pk.check_out_time, time '18:00'))::timestamp,
    (case
      when r.status = 'cancelled' then 'cancelled'
      when r.status = 'pending' then 'pending'
      when local_now < (r.check_in + coalesce(pk.check_in_time, time '09:00')) then 'not_yet'
      when local_now > (r.check_out + coalesce(pk.check_out_time, time '18:00')) then 'expired'
      else 'valid'
    end)::text
  from public.reservations r
  left join public.profiles pr on pr.id = r.profile_id
  left join public.packages pk on pk.name = r.room_type
  where r.id = reservation_token
     or exists (
       select 1
       from public.reservation_access_tokens t
       where t.reservation_id = r.id
         and (t.id = reservation_token
              or t.token_hash = hashtextextended(reservation_token::text, 0))
     )
  limit 1;
end;
$$;

revoke all on function public.validate_reservation_qr(uuid) from public;
revoke all on function public.validate_reservation_qr(uuid) from anon;
grant execute on function public.validate_reservation_qr(uuid) to authenticated;
