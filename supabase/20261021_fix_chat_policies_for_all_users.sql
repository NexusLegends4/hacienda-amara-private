-- Fix chat policies to work for all users (guests, clients, staff, admins)
-- Run this migration in Supabase after the existing chat and profile migrations.

-- First, ensure the is_admin_or_staff_user function exists
create or replace function public.is_admin_or_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and p.role in ('admin', 'staff')
	);
$$;

revoke all on function public.is_admin_or_staff_user() from public;
grant execute on function public.is_admin_or_staff_user() to authenticated;

-- Ensure the chat_messages table has the correct sender_role constraint
alter table public.chat_messages
	drop constraint if exists chat_messages_sender_role_check;

alter table public.chat_messages
	add constraint chat_messages_sender_role_check
	check (sender_role in ('admin', 'staff', 'client', 'bot'));

-- Update RLS policies for chat_messages table

-- 1. SELECT policy - Allow reading for:
--    - Admins and staff (all conversations)
--    - Clients (their own conversations)
--    - Anonymous users (guest conversations only)
drop policy if exists "Allow authenticated users to read chat messages" on public.chat_messages;
create policy "Allow authenticated users to read chat messages"
on public.chat_messages
for select
to authenticated
using (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);

-- Allow anonymous users to read guest conversations
drop policy if exists "Allow guests to read guest chat messages" on public.chat_messages;
create policy "Allow guests to read guest chat messages"
on public.chat_messages
for select
to anon
using (conversation_key = 'guest');

-- 2. INSERT policy - Allow inserting for:
--    - Admins and staff (all conversations)
--    - Clients (their own conversations)
--    - Anonymous users (guest conversations only)
drop policy if exists "Allow authenticated users to insert chat messages" on public.chat_messages;
create policy "Allow authenticated users to insert chat messages"
on public.chat_messages
for insert
to authenticated
with check (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);

-- Allow anonymous users to insert guest conversations
drop policy if exists "Allow guests to insert guest chat messages" on public.chat_messages;
create policy "Allow guests to insert guest chat messages"
on public.chat_messages
for insert
to anon
with check (conversation_key = 'guest');

-- 3. DELETE policy - Allow deleting for:
--    - Admins and staff (all conversations)
--    - Clients (their own conversations)
drop policy if exists "Allow administrators to delete chat messages" on public.chat_messages;
create policy "Allow administrators to delete chat messages"
on public.chat_messages
for delete
to authenticated
using (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);

-- 4. UPDATE policy - Generally not needed for chat messages, but if needed:
--    - Admins and staff might need to update messages (e.g., moderation)
drop policy if exists "Allow administrators to update chat messages" on public.chat_messages;
create policy "Allow administrators to update chat messages"
on public.chat_messages
for update
to authenticated
using (
	public.is_admin_or_staff_user()
)
with check (
	public.is_admin_or_staff_user()
);

-- Ensure the chat-media storage bucket has proper policies
-- (This assumes the bucket already exists)

-- Allow authenticated users to upload to their own conversation folders
drop policy if exists "Allow authenticated users to upload chat media" on storage.objects;
create policy "Allow authenticated users to upload chat media"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'chat-media'
	and (storage.foldername(name))[1] = 'conversations'
	and (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow admins/staff to upload to any conversation folder
drop policy if exists "Allow admins to upload chat media" on storage.objects;
create policy "Allow admins to upload chat media"
on storage.objects
for insert
to authenticated
with check (
	bucket_id = 'chat-media'
	and (storage.foldername(name))[1] = 'conversations'
	and public.is_admin_or_staff_user()
);

-- Allow authenticated users to read their own chat media
drop policy if exists "Allow authenticated users to read chat media" on storage.objects;
create policy "Allow authenticated users to read chat media"
on storage.objects
for select
to authenticated
using (
	bucket_id = 'chat-media'
	and (
		(storage.foldername(name))[1] = 'conversations'
		and (storage.foldername(name))[2] = auth.uid()::text
	)
	or public.is_admin_or_staff_user()
);

-- Allow anonymous users to read guest chat media (if any)
drop policy if exists "Allow guests to read guest chat media" on storage.objects;
create policy "Allow guests to read guest chat media"
on storage.objects
for select
to anon
using (
	bucket_id = 'chat-media'
	and (storage.foldername(name))[1] = 'conversations'
	and (storage.foldername(name))[2] = 'guest'
);

-- Allow users to delete their own chat media
drop policy if exists "Allow users to delete own chat media" on storage.objects;
create policy "Allow users to delete own chat media"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'chat-media'
	and (storage.foldername(name))[1] = 'conversations'
	and (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow admins to delete any chat media
drop policy if exists "Allow admins to delete chat media" on storage.objects;
create policy "Allow admins to delete chat media"
on storage.objects
for delete
to authenticated
using (
	bucket_id = 'chat-media'
	and public.is_admin_or_staff_user()
);