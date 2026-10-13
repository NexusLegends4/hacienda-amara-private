-- Allow clients to clear every message in their own chat, including bot replies.
drop policy if exists "Allow users to delete own chat messages" on public.chat_messages;
create policy "Allow users to delete own chat messages"
on public.chat_messages
for delete
to authenticated
using (
	conversation_key = auth.uid()::text
);
