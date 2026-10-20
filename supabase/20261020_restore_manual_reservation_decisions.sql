-- Restore staff-managed reservation decisions and notify staff when PayMongo records payment.

do $$
declare
  scheduled_job record;
begin
  for scheduled_job in
    select jobid
    from cron.job
    where jobname = 'deny-expired-unpaid-reservations'
  loop
    perform cron.unschedule(scheduled_job.jobid);
  end loop;
end;
$$;

drop trigger if exists guard_automatic_reservation_decisions on public.reservations;
drop function if exists public.guard_automatic_reservation_decisions();
drop function if exists public.deny_expired_unpaid_reservations();

create or replace function public.notify_staff_of_reservation_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_name text;
  payment_description text;
begin
  if old.payment_status is not distinct from new.payment_status
    or new.payment_status not in ('down_payment_paid', 'fully_paid') then
    return new;
  end if;

  if new.profile_id is not null then
    select trim(concat_ws(' ', firstname, lastname))
      into customer_name
      from public.profiles
      where id = new.profile_id;
  end if;

  customer_name := coalesce(nullif(customer_name, ''), nullif(new.guest_name, ''), 'Guest');
  payment_description := case new.payment_status
    when 'down_payment_paid' then 'initial payment'
    else 'remaining balance'
  end;

  insert into public.notifications (profile_id, message, type)
  select
    staff_profile.id,
    'PayMongo received the ' || payment_description || ' for '
      || customer_name || '''s reservation for '
      || coalesce(nullif(new.room_type, ''), 'a room')
      || ' on ' || coalesce(new.check_in::text, 'the selected date')
      || '. Amount received to date: ₱' || coalesce(new.amount_paid, 0)::text
      || '. Review the reservation in Manage Reservations.',
    'payment'
  from public.profiles staff_profile
  where staff_profile.role in ('admin', 'staff');

  return new;
end;
$$;

revoke all on function public.notify_staff_of_reservation_payment() from public;

drop trigger if exists tr_reservation_payment_notify_staff on public.reservations;
create trigger tr_reservation_payment_notify_staff
  after update of payment_status on public.reservations
  for each row
  when (old.payment_status is distinct from new.payment_status)
  execute function public.notify_staff_of_reservation_payment();

notify pgrst, 'reload schema';
