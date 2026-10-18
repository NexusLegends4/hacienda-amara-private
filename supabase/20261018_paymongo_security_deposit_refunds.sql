alter table public.reservations
  add column if not exists paymongo_checkout_payment_id text,
  add column if not exists paymongo_balance_payment_id text,
  add column if not exists paymongo_security_deposit_refund_id text,
  add column if not exists security_deposit_refund_status text not null default 'not_requested',
  add column if not exists security_deposit_refund_requested_at timestamptz;

alter table public.reservations
  drop constraint if exists reservations_security_deposit_refund_status_check;

alter table public.reservations
  add constraint reservations_security_deposit_refund_status_check check (
    security_deposit_refund_status in (
      'not_requested',
      'processing',
      'pending',
      'succeeded',
      'manual_review'
    )
  );

create unique index if not exists reservations_paymongo_security_deposit_refund_id_idx
  on public.reservations (paymongo_security_deposit_refund_id)
  where paymongo_security_deposit_refund_id is not null;

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
  security_deposit_refund_status text
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
    r.security_deposit_refund_status
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
