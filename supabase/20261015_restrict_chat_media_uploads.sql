-- Keep chat media private and allow uploads only to an owned or verified
-- staff conversation path. Run after 20261013_secure_chat_media.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'chat-media',
	'chat-media',
	false,
	52428800,
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow conversation participants to upload chat media" on storage.objects;

create policy "Allow conversation participants to upload chat media"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'chat-media'
	and (storage.foldername(name))[1] = 'conversations'
	and cardinality(storage.foldername(name)) = 3
	and (
		(storage.foldername(name))[2] = auth.uid()::text
		or (
			public.is_admin_or_staff_user()
			and public.has_staff_verification()
			and exists (
				select 1
				from public.chat_messages message
				where message.conversation_key = (storage.foldername(name))[2]
					and message.sender_role = 'client'
			)
		)
	)
);
