-- Shared chat history for clients and administrators.
-- Run this in the Supabase SQL editor after the profile role/security migrations.

create table if not exists public.chat_messages (
	id text primary key,
	conversation_key text not null,
	sender_id text not null,
	sender_role text not null check (sender_role in ('admin', 'client', 'bot')),
	sender_name text not null default '',
	content text not null default '',
	created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_key_created_at_idx
on public.chat_messages (conversation_key, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "Allow authenticated users to read chat messages" on public.chat_messages;
create policy "Allow authenticated users to read chat messages"
on public.chat_messages
for select
to authenticated
using (
	public.is_admin_user()
	or conversation_key = auth.uid()::text
	or conversation_key = 'guest'
);

drop policy if exists "Allow guests to read guest chat messages" on public.chat_messages;
create policy "Allow guests to read guest chat messages"
on public.chat_messages
for select
to anon
using (conversation_key = 'guest');

drop policy if exists "Allow authenticated users to insert chat messages" on public.chat_messages;
create policy "Allow authenticated users to insert chat messages"
on public.chat_messages
for insert
to authenticated
with check (
	public.is_admin_user()
	or conversation_key = auth.uid()::text
	or conversation_key = 'guest'
);

drop policy if exists "Allow guests to insert guest chat messages" on public.chat_messages;
create policy "Allow guests to insert guest chat messages"
on public.chat_messages
for insert
to anon
with check (conversation_key = 'guest');

drop policy if exists "Allow administrators to delete chat messages" on public.chat_messages;
create policy "Allow administrators to delete chat messages"
on public.chat_messages
for delete
to authenticated
using (
	public.is_admin_user()
	or conversation_key = auth.uid()::text
);
