-- Allow administrators to read and update client accounts from the app.
-- Run this in the Supabase SQL editor after the role/security migrations.

create or replace function public.is_admin_user()
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
			and p.role = 'admin'
	);
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

do $$
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
			and policyname = 'Allow administrators to read all profiles'
	) then
		create policy "Allow administrators to read all profiles"
		on public.profiles
		for select
		to authenticated
		using (public.is_admin_user());
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

	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'profiles'
			and policyname = 'Allow administrators to update all profiles'
	) then
		create policy "Allow administrators to update all profiles"
		on public.profiles
		for update
		to authenticated
		using (public.is_admin_user())
		with check (public.is_admin_user());
	end if;
end $$;
