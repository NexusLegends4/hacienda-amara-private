-- Lock down profile roles so users cannot self-promote from the client app.
-- Run this in the Supabase SQL editor after the role migration files.

create or replace function public.enforce_profile_role_security()
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

		return new;
	end if;

	if tg_op = 'UPDATE' and new.role is distinct from old.role then
		if not admin_user then
			raise exception 'Only administrators can change profile roles.';
		end if;
	end if;

	return new;
end;
$$;

drop trigger if exists enforce_profile_role_security on public.profiles;

create trigger enforce_profile_role_security
before insert or update on public.profiles
for each row
execute function public.enforce_profile_role_security();
