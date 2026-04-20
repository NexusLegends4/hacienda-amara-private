-- Profile avatar storage for client and admin accounts.
-- Run this in the Supabase SQL editor.

alter table public.profiles
add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set
	public = excluded.public,
	name = excluded.name;

drop policy if exists "Allow authenticated profile avatar uploads" on storage.objects;

create policy "Allow authenticated profile avatar uploads"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'profile-avatars'
);