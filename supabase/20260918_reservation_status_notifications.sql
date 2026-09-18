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
    or new.status not in ('confirmed', 'cancelled') then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles handler
    where handler.id = auth.uid()
      and handler.role in ('admin', 'staff')
  ) then
    raise exception 'Only admin or staff can update reservation status';
  end if;

  select trim(concat_ws(' ', firstname, lastname))
    into handler_name
    from public.profiles
    where id = auth.uid();

  booking_label := coalesce(nullif(new.room_type, ''), 'your reservation')
    || ' on '
    || coalesce(new.check_in::text, 'the selected date');

  if new.profile_id is not null then
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
        when 'cancelled' then
          coalesce(nullif(handler_name, ''), 'Admin or staff')
          || ' declined '
          || coalesce(nullif(customer_name, ''), 'your booking')
          || '''s booking for '
          || booking_label
          || '.'
      end,
      'reservation'
    );
  else
    customer_name := coalesce(nullif(new.guest_name, ''), 'Guest');
    guest_message := case new.status
      when 'confirmed' then
        coalesce(nullif(handler_name, ''), 'Admin or staff')
        || ' accepted '
        || customer_name
        || '''s booking for '
        || booking_label
        || '.'
      when 'cancelled' then
        coalesce(nullif(handler_name, ''), 'Admin or staff')
        || ' declined '
        || customer_name
        || '''s booking for '
        || booking_label
        || '.'
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
      new.guest_email,
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

drop trigger if exists tr_reservation_status_update on public.reservations;

create trigger tr_reservation_status_update
after update on public.reservations
for each row
execute function public.on_reservation_status_update();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
