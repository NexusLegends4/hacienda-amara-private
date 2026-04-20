-- Promote Jun Michael Ricafrente to admin.
-- Run this in the Supabase SQL editor as a privileged database role.

begin;

alter table public.profiles disable trigger user;

update public.profiles
set role = 'admin'
where trim(concat_ws(' ', firstname, lastname)) = 'Jun Michael Ricafrente';

alter table public.profiles enable trigger user;

commit;
