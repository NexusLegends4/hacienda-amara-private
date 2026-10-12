-- Store an optional contact number on each user profile.
alter table public.profiles
	add column if not exists contact_number text;
