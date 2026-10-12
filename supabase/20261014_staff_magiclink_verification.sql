-- Allow staff/admin authorization after a verified Supabase magic-link OTP.
-- Run after 20261012_staff_email_otp_auth.sql in the Supabase SQL Editor.

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
			and (
				coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"otp"}]'::jsonb
				or coalesce(auth.jwt() -> 'amr', '[]'::jsonb) @> '[{"method":"magiclink"}]'::jsonb
			)
		);
$$;

revoke all on function public.has_staff_verification() from public;
grant execute on function public.has_staff_verification() to authenticated;
