-- Automatically accept on-time paid bookings and deny initial checkouts unpaid after one hour.
create extension if not exists pg_cron with schema pg_catalog;

alter table public.reservations
  add column if not exists initial_payment_deadline_at timestamptz,
  add column if not exists late_payment_received_at timestamptz,
  add column if not exists security_deposit_refund_status text not null default 'not_requested';

-- Give outstanding checkouts already in progress one hour from this migration.
update public.reservations
set initial_payment_deadline_at = now() + interval '1 hour'
where status = 'pending'
  and payment_status = 'checkout_pending'
  and paymongo_checkout_session_id is not null
  and initial_payment_deadline_at is null;

create or replace function public.guard_automatic_reservation_decisions()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'pending'
    and new.status in ('confirmed', 'denied')
    and coalesce(auth.role(), '') <> 'service_role'
    and current_setting('app.automatic_reservation_decision', true) is distinct from 'on' then
    raise exception 'Reservation acceptance and denial are determined automatically by payment status.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_automatic_reservation_decisions on public.reservations;
create trigger guard_automatic_reservation_decisions
  before update of status on public.reservations
  for each row execute function public.guard_automatic_reservation_decisions();

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
  is_automatic boolean;
begin
  if old.status is not distinct from new.status
    or new.status not in ('confirmed', 'denied', 'cancelled') then
    return new;
  end if;

  is_automatic := coalesce(auth.role(), '') = 'service_role'
    or current_setting('app.automatic_reservation_decision', true) = 'on';
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
          case when is_automatic then 'PayMongo confirmed your initial payment. Your booking for '
            else coalesce(nullif(handler_name, ''), 'Admin or staff') || ' accepted ' end
          || case when is_automatic then booking_label || ' was automatically accepted.'
            else coalesce(nullif(customer_name, ''), 'your booking')
              || '''s booking for ' || booking_label || '.' end
        when 'denied' then
          case when is_automatic then 'Your booking for ' || booking_label
            || ' was automatically denied because payment was not received within one hour.'
            else coalesce(nullif(handler_name, ''), 'Admin or staff')
              || ' denied ' || coalesce(nullif(customer_name, ''), 'your booking')
              || '''s request for ' || booking_label || '.'
              || case when nullif(trim(new.rejection_reason), '') is null then ''
                 else ' Reason: ' || trim(new.rejection_reason) end end
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
        case when is_automatic then
          'PayMongo confirmed your initial payment. Your reservation for '
          || booking_label
          || ' was automatically accepted.'
        else
          'Good news! Your reservation for '
          || booking_label
          || ' has been accepted by Hacienda Amara.'
        end
      when 'denied' then
        case when is_automatic then
          'Your reservation for '
          || booking_label
          || ' was automatically denied because payment was not received within one hour.'
        else
          'Your reservation request for '
          || booking_label
          || ' was denied.'
          || case when nullif(trim(new.rejection_reason), '') is null then
             ' Please contact Hacienda Amara for assistance.'
             else ' Reason: ' || trim(new.rejection_reason) end
        end
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

create or replace function public.deny_expired_unpaid_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  denied_count integer;
begin
  perform set_config('app.automatic_reservation_decision', 'on', true);

  update public.reservations
  set status = 'denied',
      rejection_reason = 'Automatically denied because the initial payment was not received within one hour.'
  where status = 'pending'
    and payment_status = 'checkout_pending'
    and paymongo_checkout_session_id is not null
    and initial_payment_deadline_at <= now();

  get diagnostics denied_count = row_count;
  return denied_count;
end;
$$;

revoke all on function public.deny_expired_unpaid_reservations() from public, anon, authenticated;
grant execute on function public.deny_expired_unpaid_reservations() to service_role;

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

select cron.schedule(
  'deny-expired-unpaid-reservations',
  '* * * * *',
  'select public.deny_expired_unpaid_reservations();'
);

drop function if exists public.get_guest_reservation_notification(uuid);

create function public.get_guest_reservation_notification(reservation_token uuid)
returns table (
  guest_name text,
  room_type text,
  check_in date,
  status text,
  message text,
  updated_at timestamptz,
  total_price numeric,
  payment_status text,
  down_payment_amount numeric,
  security_deposit_amount numeric,
  balance_due numeric,
  security_deposit_refund_status text,
  initial_payment_deadline_at timestamptz,
  late_payment_received_at timestamptz
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
    n.created_at as updated_at,
    r.total_price,
    r.payment_status,
    r.down_payment_amount,
    r.security_deposit_amount,
    r.balance_due,
    r.security_deposit_refund_status,
    r.initial_payment_deadline_at,
    r.late_payment_received_at
  from public.guest_reservation_notifications n
  join public.reservation_access_tokens access_token
    on access_token.reservation_id = n.reservation_id
  join public.reservations r
    on r.id = n.reservation_id
  where r.status = n.status
    and access_token.expires_at > now()
    and (
      access_token.reservation_id = reservation_token
      or access_token.token_hash = hashtextextended(reservation_token::text, 0)
      or access_token.id = reservation_token
    )
  order by n.created_at desc
  limit 1;
$$;

revoke all on function public.get_guest_reservation_notification(uuid) from public;
grant execute on function public.get_guest_reservation_notification(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
