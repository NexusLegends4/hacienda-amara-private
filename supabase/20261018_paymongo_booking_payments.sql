alter table public.reservations
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists down_payment_amount numeric(10, 2),
  add column if not exists security_deposit_amount numeric(10, 2),
  add column if not exists amount_paid numeric(10, 2) not null default 0,
  add column if not exists balance_due numeric(10, 2),
  add column if not exists paymongo_checkout_session_id text,
  add column if not exists paymongo_checkout_url text,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists paymongo_balance_checkout_session_id text,
  add column if not exists paymongo_balance_checkout_url text,
  add column if not exists balance_paid_at timestamptz;

alter table public.reservations
  drop constraint if exists reservations_payment_status_check;

alter table public.reservations
  add constraint reservations_payment_status_check check (
    payment_status in ('unpaid', 'checkout_pending', 'down_payment_paid', 'fully_paid', 'refunded')
  );

create unique index if not exists reservations_paymongo_checkout_session_id_idx
  on public.reservations (paymongo_checkout_session_id)
  where paymongo_checkout_session_id is not null;

create unique index if not exists reservations_paymongo_balance_checkout_session_id_idx
  on public.reservations (paymongo_balance_checkout_session_id)
  where paymongo_balance_checkout_session_id is not null;

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
  balance_due numeric
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
    r.balance_due
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
