-- Add account role support to user profiles.
-- Run this in the Supabase SQL editor.

begin;

alter table public.profiles
add column if not exists role text;

-- Disable ONLY user triggers (won't touch system triggers like RI_ConstraintTrigger...)
alter table public.profiles disable trigger user;

alter table public.profiles
drop constraint if exists profiles_role_check;

update public.profiles
set role = 'client'
where role is null
   or role = 'user'
   or role not in ('client', 'admin');

alter table public.profiles
add constraint profiles_role_check
check (role in ('client', 'admin'));

alter table public.profiles
alter column role set default 'client';

alter table public.profiles
alter column role set not null;

-- Re-enable ONLY user triggers
alter table public.profiles enable trigger user;

commit;