-- Use per-conversation private object paths for persistent chat media.
-- Run after 20261012_staff_email_otp_auth.sql and the chat message migrations.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'chat-media',
	'chat-media',
	false,
	52428800,
	array[
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/gif',
		'video/mp4',
		'video/webm'
	]
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow authenticated chat media uploads" on storage.objects;
drop policy if exists "Allow conversation participants to read chat media" on storage.objects;
drop policy if exists "Allow conversation participants to upload chat media" on storage.objects;
drop policy if exists "Allow conversation participants to delete chat media" on storage.objects;

create policy "Allow conversation participants to read chat media"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'chat-media'
	and (
		(
			(storage.foldername(name))[1] = 'conversations'
			and (
				(storage.foldername(name))[2] = auth.uid()::text
				or (
					public.is_staff_or_admin_user()
					and public.has_staff_verification()
				)
			)
		)
		or exists (
			select 1
			from public.chat_messages message
			where (
				message.conversation_key = auth.uid()::text
				or (
					public.is_staff_or_admin_user()
					and public.has_staff_verification()
				)
			)
			and message.content like '%' || '"path":"' || name || '"' || '%'
		)
	)
);

create policy "Allow conversation participants to upload chat media"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'chat-media'
	and (storage.foldername(name))[1] = 'conversations'
	and (
		(storage.foldername(name))[2] = auth.uid()::text
		or (
			public.is_staff_or_admin_user()
			and public.has_staff_verification()
		)
	)
);

create policy "Allow conversation participants to delete chat media"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'chat-media'
	and (
		(
			(storage.foldername(name))[1] = 'conversations'
			and (
				(storage.foldername(name))[2] = auth.uid()::text
				or (
					public.is_staff_or_admin_user()
					and public.has_staff_verification()
				)
			)
		)
		or exists (
			select 1
			from public.chat_messages message
			where (
				message.conversation_key = auth.uid()::text
				or (
					public.is_staff_or_admin_user()
					and public.has_staff_verification()
				)
			)
			and message.content like '%' || '"path":"' || name || '"' || '%'
		)
	)
);
