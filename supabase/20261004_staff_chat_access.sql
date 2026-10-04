-- Give staff the same shared customer chat access as administrators.
-- Run this migration in Supabase after the existing chat and profile migrations.

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

alter table public.chat_messages
	drop constraint if exists chat_messages_sender_role_check;

alter table public.chat_messages
	add constraint chat_messages_sender_role_check
	check (sender_role in ('admin', 'staff', 'client', 'bot'));

drop policy if exists "Allow authenticated users to read chat messages" on public.chat_messages;
create policy "Allow authenticated users to read chat messages"
on public.chat_messages
for select
to authenticated
using (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);

-- The legacy shared "guest" key would let anonymous customers read each
-- other's messages. Guest threads stay in each browser's local storage.
drop policy if exists "Allow guests to read guest chat messages" on public.chat_messages;

drop policy if exists "Allow authenticated users to insert chat messages" on public.chat_messages;
create policy "Allow authenticated users to insert chat messages"
on public.chat_messages
for insert
to authenticated
with check (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);

drop policy if exists "Allow guests to insert guest chat messages" on public.chat_messages;

drop policy if exists "Allow administrators to delete chat messages" on public.chat_messages;
create policy "Allow administrators to delete chat messages"
on public.chat_messages
for delete
to authenticated
using (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);
