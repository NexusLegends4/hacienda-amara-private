-- Read-only diagnostics for "Database error creating anonymous user".
-- Run in Supabase SQL Editor. Any non-internal trigger on auth.users runs
-- inside the signup transaction; a failure there rolls back the new user.

select
	trigger_row.tgname as trigger_name,
	pg_get_triggerdef(trigger_row.oid, true) as trigger_definition,
	function_row.oid::regprocedure as function_name,
	pg_get_functiondef(function_row.oid) as function_definition
from pg_trigger trigger_row
join pg_class table_row on table_row.oid = trigger_row.tgrelid
join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
join pg_proc function_row on function_row.oid = trigger_row.tgfoid
where schema_row.nspname = 'auth'
	and table_row.relname = 'users'
	and not trigger_row.tgisinternal
order by trigger_row.tgname;

-- Show profile columns that a signup trigger may be required to populate.
select
	column_name,
	data_type,
	is_nullable,
	column_default
from information_schema.columns
where table_schema = 'public'
	and table_name = 'profiles'
order by ordinal_position;
