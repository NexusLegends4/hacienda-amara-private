-- Allow users to delete their own chat messages on logout
-- Run this in the Supabase SQL editor

drop policy if exists "Allow users to delete own chat messages" on public.chat_messages;
create policy "Allow users to delete own chat messages"
on public.chat_messages
for delete
to authenticated
using (
  sender_id = auth.uid()::text
);

-- Ensure staff/admin can still delete any messages (already in 20261004_staff_chat_access.sql)
-- This migration adds the sender_id check for regular users deleting their own messages