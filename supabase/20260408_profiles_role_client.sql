-- Normalize older role data to the current client/admin schema.
-- Run this after 20260407_profiles_role.sql if you still have legacy user rows.

select
  t.tgname as trigger_name,
  p.proname as function_name,
  t.tgenabled,
  t.tgtype
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and c.relname = 'profiles'
  and not t.tgisinternal
order by t.tgname;