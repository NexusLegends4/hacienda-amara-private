alter table public.reservations
  add column if not exists rejection_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_rejection_reason_length'
  ) then
    alter table public.reservations
      add constraint reservations_rejection_reason_length
      check (rejection_reason is null or length(rejection_reason) <= 300);
  end if;
end $$;

create table if not exists public.reservation_maintenance (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reservation_maintenance_date_order check (end_date >= start_date),
  constraint reservation_maintenance_reason_length check (length(reason) <= 300)
);

alter table public.reservation_maintenance enable row level security;
revoke all on public.reservation_maintenance from public;
grant select on public.reservation_maintenance to anon, authenticated;
grant insert, update, delete on public.reservation_maintenance to authenticated;

drop policy if exists reservation_maintenance_read on public.reservation_maintenance;
create policy reservation_maintenance_read
  on public.reservation_maintenance
  for select to anon, authenticated
  using (true);

drop policy if exists reservation_maintenance_manage on public.reservation_maintenance;
create policy reservation_maintenance_manage
  on public.reservation_maintenance
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
    and (created_by is null or created_by = auth.uid())
  );

create or replace function public.get_reservation_maintenance()
returns table (id uuid, start_date date, end_date date, reason text)
language sql
security definer
stable
set search_path = public
as $$
  select maintenance.id, maintenance.start_date, maintenance.end_date, maintenance.reason
  from public.reservation_maintenance maintenance
  order by maintenance.start_date;
$$;

revoke all on function public.get_reservation_maintenance() from public;
grant execute on function public.get_reservation_maintenance() to anon, authenticated;

create or replace function public.guard_reservation_maintenance_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('hacienda-reservation-slots'));

  if tg_table_name = 'reservations' then
    if new.status not in ('cancelled', 'denied') and exists (
      select 1
      from public.reservation_maintenance maintenance
      where daterange(maintenance.start_date, maintenance.end_date, '[]')
        && daterange(new.check_in, new.check_out, '[]')
    ) then
      raise exception 'Selected dates are unavailable due to scheduled maintenance.';
    end if;
  elsif tg_op <> 'DELETE' then
    if exists (
      select 1
      from public.reservations reservation
      where reservation.status not in ('cancelled', 'denied')
        and daterange(reservation.check_in, reservation.check_out, '[]')
          && daterange(new.start_date, new.end_date, '[]')
    ) then
      raise exception 'Maintenance dates cannot overlap an active reservation.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_reservation_maintenance_conflicts() from public;

drop trigger if exists reservation_maintenance_conflict_guard on public.reservations;
create trigger reservation_maintenance_conflict_guard
before insert or update of check_in, check_out, status on public.reservations
for each row execute function public.guard_reservation_maintenance_conflicts();

drop trigger if exists maintenance_reservation_conflict_guard on public.reservation_maintenance;
create trigger maintenance_reservation_conflict_guard
before insert or update or delete on public.reservation_maintenance
for each row execute function public.guard_reservation_maintenance_conflicts();

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
          || case when nullif(trim(new.rejection_reason), '') is null then ''
             else ' Reason: ' || trim(new.rejection_reason) end
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
        || ' was denied.'
        || case when nullif(trim(new.rejection_reason), '') is null then
           ' Please contact Hacienda Amara for assistance.'
           else ' Reason: ' || trim(new.rejection_reason) end
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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reservation_maintenance'
  ) then
    alter publication supabase_realtime add table public.reservation_maintenance;
  end if;
end $$;
