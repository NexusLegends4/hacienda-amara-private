-- Publish chat_messages through the Supabase Realtime publication.
--
-- Without this, the postgres_changes subscription the chat uses never fires
-- for chat_messages, so a new guest or customer message only reached the
-- admin/staff sidebar after the 4 second polling fallback. Adding the table
-- to the publication makes the delivery instant. Realtime applies the same
-- row-level security policies, so each participant only receives the rows
-- they are already allowed to read.

do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'chat_messages'
	) then
		alter publication supabase_realtime add table public.chat_messages;
	end if;
end;
$$;
