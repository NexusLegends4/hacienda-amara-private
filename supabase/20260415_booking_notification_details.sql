create or replace function public.on_reservation_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  handler_name text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  select trim(concat_ws(' ', firstname, lastname))
    into handler_name
  from public.profiles
  where id = auth.uid();

  handler_name := coalesce(nullif(handler_name, ''), 'Admin');

  insert into public.notifications (profile_id, message, type)
  values (
    new.profile_id,
    case
      when new.status = 'confirmed' then
        handler_name || ' accepted your booking for ' || new.room_type || ' on ' || new.check_in || '.'
      when new.status = 'cancelled' then
        handler_name || ' rejected your booking for ' || new.room_type || ' on ' || new.check_in || '.'
      else
        'Your reservation status has been updated to ' || new.status || ' for ' || new.room_type || ' on ' || new.check_in || '.'
    end,
    'reservation'
  );

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
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create or replace function public.on_reservation_created_notify_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
  client_email text;
begin
  select
    trim(concat_ws(' ', firstname, lastname)),
    email
  into client_name, client_email
  from public.profiles
  where id = new.profile_id;

  insert into public.auth_notifications (
    event_type,
    actor_profile_id,
    actor_role,
    actor_name,
    actor_email
  )
  values (
    'booking',
    new.profile_id::text,
    'client',
    coalesce(nullif(client_name, ''), coalesce(client_email, 'Unknown client')),
    coalesce(client_email, '')
  );

  return new;
end;
$$;

revoke all on function public.on_reservation_created_notify_admin() from public;

drop trigger if exists tr_reservation_created_notify_admin on public.reservations;

create trigger tr_reservation_created_notify_admin
after insert on public.reservations
for each row
execute function public.on_reservation_created_notify_admin();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'auth_notifications'
  ) then
    alter publication supabase_realtime add table public.auth_notifications;
  end if;
end $$;
