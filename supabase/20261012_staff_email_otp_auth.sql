-- Allow staff/admin access after either TOTP AAL2 or a verified email OTP sign-in.
-- Run after 20261012_staff_admin_totp_mfa.sql in the Supabase SQL Editor.

create or replace function public.has_staff_verification()
returns boolean
language sql
stable
set search_path = public
as $$
	select
		auth.jwt() ->> 'aal' = 'aal2'
		or (
			auth.jwt() ->> 'aal' = 'aal1'
			and coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"otp"}]'::jsonb
		);
$$;

revoke all on function public.has_staff_verification() from public;
grant execute on function public.has_staff_verification() to authenticated;

do $$
declare
	table_record record;
begin
	for table_record in
		select c.relname
		from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public'
			and c.relkind in ('r', 'p')
			and c.relrowsecurity
	loop
		if table_record.relname = 'profiles' then
			execute format(
				'drop policy if exists %I on public.%I',
				'Allow own profile read during MFA setup',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Allow own profile read with verified staff access',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for select to authenticated using (id = auth.uid() or public.has_staff_verification())',
				'Allow own profile read with verified staff access',
				table_record.relname
			);

			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for profile inserts',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require verified staff access for profile inserts',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for insert to authenticated with check (public.has_staff_verification() or (id = auth.uid() and role = ''client''))',
				'Require verified staff access for profile inserts',
				table_record.relname
			);

			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for profile updates',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require verified staff access for profile updates',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for update to authenticated using (not public.is_staff_or_admin_user() or public.has_staff_verification()) with check (not public.is_staff_or_admin_user() or public.has_staff_verification())',
				'Require verified staff access for profile updates',
				table_record.relname
			);

			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for profile deletes',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require verified staff access for profile deletes',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for delete to authenticated using (not public.is_staff_or_admin_user() or public.has_staff_verification())',
				'Require verified staff access for profile deletes',
				table_record.relname
			);
		else
			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for staff and admin',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require verified staff access',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for all to authenticated using (not public.is_staff_or_admin_user() or public.has_staff_verification()) with check (not public.is_staff_or_admin_user() or public.has_staff_verification())',
				'Require verified staff access',
				table_record.relname
			);
		end if;
	end loop;
end
$$;
