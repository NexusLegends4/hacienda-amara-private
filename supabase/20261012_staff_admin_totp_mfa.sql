-- Require Supabase Auth AAL2 for staff/admin access to RLS-protected tables.
-- Run after 20261004_staff_chat_access.sql in the Supabase SQL Editor.

create or replace function public.is_staff_or_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and p.role in ('admin', 'staff')
	);
$$;

revoke all on function public.is_staff_or_admin_user() from public;
grant execute on function public.is_staff_or_admin_user() to authenticated;

alter table public.profiles enable row level security;

do $$
declare
	table_record record;
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'profiles'
			and policyname = 'Allow users to read their own profiles'
	) then
		create policy "Allow users to read their own profiles"
		on public.profiles
		for select
		to authenticated
		using (id = auth.uid());
	end if;

	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'profiles'
			and policyname = 'Allow users to update their own profile'
	) then
		create policy "Allow users to update their own profile"
		on public.profiles
		for update
		to authenticated
		using (id = auth.uid())
		with check (id = auth.uid());
	end if;

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
				'Require AAL2 for privileged profile access',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Allow own profile read during MFA setup',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for select to authenticated using (id = auth.uid() or auth.jwt() ->> ''aal'' = ''aal2'')',
				'Allow own profile read during MFA setup',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for profile inserts',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for insert to authenticated with check (auth.jwt() ->> ''aal'' = ''aal2'' or (id = auth.uid() and role = ''client''))',
				'Require AAL2 for profile inserts',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for profile updates',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for update to authenticated using (not public.is_staff_or_admin_user() or auth.jwt() ->> ''aal'' = ''aal2'') with check (not public.is_staff_or_admin_user() or auth.jwt() ->> ''aal'' = ''aal2'')',
				'Require AAL2 for profile updates',
				table_record.relname
			);
			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for profile deletes',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for delete to authenticated using (not public.is_staff_or_admin_user() or auth.jwt() ->> ''aal'' = ''aal2'')',
				'Require AAL2 for profile deletes',
				table_record.relname
			);

			if not exists (
				select 1
				from pg_policies
				where schemaname = 'public'
					and tablename = 'profiles'
					and policyname = 'Allow users to create their own client profile'
			) then
				execute format(
					'create policy %I on public.%I as permissive for insert to authenticated with check (id = auth.uid() and role = ''client'')',
					'Allow users to create their own client profile',
					table_record.relname
				);
			end if;
		else
			execute format(
				'drop policy if exists %I on public.%I',
				'Require AAL2 for staff and admin',
				table_record.relname
			);
			execute format(
				'create policy %I on public.%I as restrictive for all to authenticated using (not public.is_staff_or_admin_user() or auth.jwt() ->> ''aal'' = ''aal2'') with check (not public.is_staff_or_admin_user() or auth.jwt() ->> ''aal'' = ''aal2'')',
				'Require AAL2 for staff and admin',
				table_record.relname
			);
		end if;
	end loop;
end
$$;
