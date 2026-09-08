-- Allow a guest to cancel their own booking using the original contact details.
-- Run after 20260829_guest_reservations.sql.

create or replace function public.cancel_guest_reservation(
  reservation_email text,
  reservation_phone text,
  reservation_check_in date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  update public.reservations
  set status = 'cancelled'
  where lower(trim(guest_email)) = lower(trim(reservation_email))
    and trim(guest_phone) = trim(reservation_phone)
    and check_in = reservation_check_in
    and status in ('pending', 'confirmed');

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.cancel_guest_reservation(text, text, date) from public;
grant execute on function public.cancel_guest_reservation(text, text, date) to anon, authenticated;

create or replace function public.get_reserved_date_ranges()
returns table (check_in date, check_out date)
language sql
security definer
set search_path = public
as $$
  select r.check_in, r.check_out
  from public.reservations r
  where r.status <> 'cancelled';
$$;

revoke all on function public.get_reserved_date_ranges() from public;
grant execute on function public.get_reserved_date_ranges() to anon, authenticated;