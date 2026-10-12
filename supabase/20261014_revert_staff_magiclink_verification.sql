-- Restore the staff verification claim check to the pre-magic-link behavior.

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
