-- Admin-only login and sign-up activity log.
-- Run this in the Supabase SQL editor after the profile role/security migrations.

create extension if not exists pgcrypto;

create table if not exists public.auth_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('login', 'signup', 'logout', 'booking')),
  actor_profile_id text not null,
  actor_role text not null default 'client' check (actor_role in ('admin', 'client')),
  actor_name text not null default '',
  actor_email text not null default '',
  created_at timestamptz not null default now()
);

-- Create notifications table for client alerts if it doesn't exist
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can see their own notifications" on public.notifications;
create policy "Users can see their own notifications" on public.notifications
  for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications" on public.notifications
  for update to authenticated using (auth.uid() = profile_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications" on public.notifications
  for delete to authenticated using (auth.uid() = profile_id);

drop policy if exists "Admin can insert notifications" on public.notifications;
create policy "Admin can insert notifications" on public.notifications
  for insert to authenticated with check (public.is_admin_user());

-- Update existing databases that still have the old event_type check.
alter table public.auth_notifications
  drop constraint if exists auth_notifications_event_type_check;

alter table public.auth_notifications
  add constraint auth_notifications_event_type_check
  check (event_type in ('login', 'signup', 'logout', 'booking'));

-- Ensure RLS
alter table public.auth_notifications enable row level security;

-- Helpful indexes (idempotent)
create index if not exists auth_notifications_created_at_idx
  on public.auth_notifications (created_at desc);

create index if not exists auth_notifications_event_type_idx
  on public.auth_notifications (event_type);

-- ADMIN READ (drop + recreate)
drop policy if exists "Allow administrators to read auth notifications"
  on public.auth_notifications;

create policy "Allow administrators to read auth notifications"
on public.auth_notifications
for select
to authenticated
using (public.is_admin_user());

-- ADMIN DELETE (drop + recreate)
drop policy if exists "Allow administrators to delete auth notifications"
  on public.auth_notifications;

create policy "Allow administrators to delete auth notifications"
on public.auth_notifications
for delete
to authenticated
using (public.is_admin_user());

-- Allow clients to insert 'booking' notifications for admin to see
drop policy if exists "Allow authenticated users to log events" on public.auth_notifications;
create policy "Allow authenticated users to log events"
on public.auth_notifications
for insert
to authenticated
with check (
  (event_type = 'booking' and actor_profile_id = auth.uid()::text) OR
  (event_type in ('login', 'logout') and actor_profile_id = auth.uid()::text)
);

-- Enable Realtime for notifications
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'auth_notifications'
  ) then
    alter publication supabase_realtime add table public.auth_notifications;
  end if;
end $$;

-- Trigger function (idempotent)
create or replace function public.log_profile_signup_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.auth_notifications (
    event_type,
    actor_profile_id,
    actor_role,
    actor_name,
    actor_email
  )
  values (
    'signup',
    new.id::text,
    'client',
    trim(concat_ws(' ', new.firstname, new.lastname)),
    new.email
  );

  return new;
end;
$$;

-- Trigger (idempotent)
drop trigger if exists log_profile_signup_notification on public.profiles;

create trigger log_profile_signup_notification
after insert on public.profiles
for each row
execute function public.log_profile_signup_notification();

-- Enable Realtime para sa Admin alerts at Client notifications
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'auth_notifications'
  ) then
    alter publication supabase_realtime add table public.auth_notifications;
  end if;
end $$;
-- Siguraduhin din na ang notifications table ay naka-enable (i-run ito kung hindi pa nagagawa)
-- alter publication supabase_realtime add table public.notifications;
