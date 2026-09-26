-- Add soft-delete support for client accounts so admins can delete and restore.
-- Run this in the Supabase SQL editor after the profile role/security migrations.

alter table public.profiles
add column if not exists deleted_at timestamptz;

create index if not exists profiles_deleted_at_idx
on public.profiles (deleted_at);

create or replace function public.enforce_profile_account_security()
returns trigger
language plpgsql
as $$
declare
	admin_user boolean := false;
begin
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and p.role = 'admin'
	)
	into admin_user;

	if tg_op = 'INSERT' then
		if new.role is null then
			new.role := 'client';
		end if;

		if new.role = 'admin' and not admin_user then
			new.role := 'client';
		end if;

		new.deleted_at := null;
		return new;
	end if;

	if tg_op = 'UPDATE' then
		-- Only administrators may touch role or deletion state.
		if new.role is distinct from old.role then
			if not admin_user then
				raise exception 'Only administrators can change profile roles.';
			end if;
		end if;

		if new.deleted_at is distinct from old.deleted_at then
			if not admin_user then
				raise exception 'Only administrators can delete or restore profiles.';
			end if;
		end if;

		if old.deleted_at is not null and not admin_user then
			raise exception 'Deleted profiles cannot be modified by non-administrators.';
		end if;
	end if;

	return new;
end;
$$;

drop trigger if exists enforce_profile_role_security on public.profiles;
drop trigger if exists enforce_profile_account_security on public.profiles;

create trigger enforce_profile_account_security
before insert or update on public.profiles
for each row
execute function public.enforce_profile_account_security();
