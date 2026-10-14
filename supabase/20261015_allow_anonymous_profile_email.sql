-- Anonymous Supabase Auth users have no email address. A project auth.users
-- trigger creates a public.profiles row for each user, so profiles.email
-- cannot be NOT NULL if anonymous sign-ins are enabled.
--
-- Also make the profile signup notification safe for profiles with no email.

alter table public.profiles
	alter column email drop not null;

create or replace function public.log_profile_signup_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public.auth_notifications (
		event_type,
		actor_profile_id,
		actor_role,
		actor_name,
		actor_email
	)
	values (
		'signup',
		new.id::text,
		'client',
		trim(concat_ws(' ', new.firstname, new.lastname)),
		coalesce(new.email, '')
	);

	return new;
end;
$$;
