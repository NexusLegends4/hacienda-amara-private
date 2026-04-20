-- Chat media storage for photos and videos.
-- Run this in the Supabase SQL editor.

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do update
set
	public = excluded.public,
	name = excluded.name;

drop policy if exists "Allow authenticated chat media uploads" on storage.objects;

create policy "Allow authenticated chat media uploads"
on storage.objects
for insert
to authenticated, anon
with check (
	bucket_id = 'chat-media'
);