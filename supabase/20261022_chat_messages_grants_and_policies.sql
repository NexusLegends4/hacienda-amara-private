-- Fix the chat_messages table so the support chat works for guests, clients
-- and staff, and so the assistant can answer inside a client conversation.
--
-- Problems this migration solves:
--   1. The table was created through the SQL editor, so anon/authenticated never
--      received the default table grants. Every insert failed with
--      "permission denied for table chat_messages".
--   2. The guardrail trigger only trusted service_role writes for bot replies,
--      so the assistant could never store its answer.
--   3. The trigger rejected short but legitimate resort questions such as
--      "How do I book?", "How do I pay?", "Are pets allowed?" or
--      "Do you allow loud music past 10pm?" as off-topic.
--
-- Run this in the Supabase SQL editor after the chat and staff access migrations.

-- 1. Make sure the helper function exists and is callable by the app roles.
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
grant execute on function public.is_admin_or_staff_user() to authenticated, anon, service_role;

-- 2. Grant the table privileges that were never applied to anon/authenticated.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.chat_messages to authenticated, service_role;
grant select, insert on public.chat_messages to anon;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- 3. Allow the existing RLS policies to be evaluated for the app roles.
alter table public.chat_messages enable row level security;

-- 4. Re-apply the chat policies for every participant type.
drop policy if exists "Allow authenticated users to read chat messages" on public.chat_messages;
create policy "Allow authenticated users to read chat messages"
on public.chat_messages
for select
to authenticated
using (
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
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
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
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
	public.is_admin_or_staff_user()
	or conversation_key = auth.uid()::text
);

drop policy if exists "Allow administrators to update chat messages" on public.chat_messages;
create policy "Allow administrators to update chat messages"
on public.chat_messages
for update
to authenticated
using (public.is_admin_or_staff_user())
with check (public.is_admin_or_staff_user());

-- 5. Keep the sender_role constraint in sync with the app.
alter table public.chat_messages
	drop constraint if exists chat_messages_sender_role_check;

alter table public.chat_messages
	add constraint chat_messages_sender_role_check
	check (sender_role in ('admin', 'staff', 'client', 'bot'));

-- Recreate the guardrail trigger so the conversation owner can store the
-- assistant reply, and so short resort questions are not treated as off-topic.
create or replace function public.enforce_chat_message_guardrails()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	current_user_id uuid := auth.uid();
	actor_role text;
	actor_name text;
	actor_id text := coalesce(auth.uid()::text, new.sender_id);
	message_text text := coalesce(new.content, '');
	previous_text text := '';
	scan_text text;
	topic_text text;
	term text;
	pattern text;
	term_character text;
	char_index integer;
	recent_count integer;
	has_attachments boolean := false;
	previous_row record;
	media_prefix constant text := '__HACIENDA_MEDIA__';
	prohibited_terms constant text[] := array[
		'puta', 'putangina', 'tangina', 'gago', 'gaga', 'bobo', 'boba', 'ulol', 'ulul',
		'tanga', 'tarantado', 'tarantada', 'punyeta', 'pakshet', 'pakyu', 'pukingina',
		'pucha', 'leche', 'lintik', 'bwisit', 'buwisit', 'yawa', 'kantot', 'kantutin',
		'jakol', 'jakulan', 'puki', 'titi', 'bayag', 'libog', 'malibog', 'burat', 'iyot',
		'kupal', 'hinayupak', 'hayop ka', 'animal ka', 'fuck', 'fucking', 'fucker', 'motherfucker',
		'shit', 'bullshit', 'bitch', 'bastard', 'asshole', 'dickhead', 'dick', 'pussy', 'cunt',
		'cock', 'whore', 'slut', 'porn', 'nude', 'naked', 'horny', 'sex', 'seks', 'sexual',
		'blowjob', 'handjob', 'masturbate', 'orgasm', 'vagina', 'penis', 'boobs', 'tits', 'rape',
		'molest', 'pedophile', 'nigger', 'nigga', 'fag', 'faggot', 'retard', 'tranny', 'murder',
		'suicide', 'bomb', 'weapon', 'kill you', 'i will kill',
		'i''ll kill', 'patayin kita', 'papatayin kita', 'mamatay ka', 'i hate you',
		'you are stupid', 'you''re stupid', 'bobo ka', 'gago ka', 'ulol ka', 'putang ina mo',
		'tangina mo', 'puta ka'
	];
	topic_pattern constant text := '(^|[^a-z0-9])(hacienda|amara|resort|booking|book|reserve|reservation|availability|available|cottage|pool|jacuzzi|barkada room|barkada|ac room|aircon|amenities|amenity|facilities|facility|inclusions|inclusion|rate|rates|price|pricing|fee|fees|payment|gcash|bdo|deposit|refund|cancel|cancellation|pay|check in|check-in|check out|check-out|policy|policies|rule|rules|location|address|direction|directions|map|schedule|operating hours|hours|event|wedding|birthday|debut|overnight|day tour|night tour|guest list|extra guests|how many guests|guest capacity|children|kids|bring food|outside food|food policy|drink policy|bring water|catering|corkage|pax|parking|pet|pets|wifi|room|bed|bunk|kitchen|stove|microwave|rice cooker|utensil|cookware|tableware|speaker|microphone|videoke|karaoke|games|swimming|bathroom|shower|generator|light|lighting|decorations|coordinator|music|loud|curfew|noise|sound|party|band|dj|sing|entertainment|alcohol|drinks|drink|bar|attendant|early|late|10pm|9pm|6am|12am|facebook|fb page|review|reviews|website|login|sign in|profile|technical|upload|chat|assistant|photo|video|presyo|magkano|bayad|reserba|nasaan|oras|gabi|umaga|bawal|pwede|puwede|smoking|smoke|glass bottle|weekday|weekend|site visit|ocular)([^a-z0-9]|$)';
begin
	if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
		if new.sender_role not in ('client', 'admin', 'staff', 'bot') then
			raise exception using errcode = '42501', message = 'Chat message could not be verified.';
		end if;
	elsif current_user_id is null then
		raise exception using errcode = '42501', message = 'Chat message could not be verified.';
	else
		select p.role, nullif(trim(concat_ws(' ', p.firstname, p.lastname)), '')
		into actor_role, actor_name
		from public.profiles p
		where p.id = current_user_id;

		if actor_role in ('admin', 'staff') then
			if not public.has_staff_verification()
				or new.sender_id <> current_user_id::text
				or new.sender_role <> actor_role
				or not exists (
					select 1 from public.chat_messages prior
					where prior.conversation_key = new.conversation_key
						and prior.sender_role = 'client'
				) then
				raise exception using errcode = '42501', message = 'Chat message could not be verified.';
			end if;
			new.sender_name := coalesce(actor_name, case actor_role when 'admin' then 'Administrator' else 'Staff' end);
		elsif actor_role = 'client' or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
			if new.sender_role = 'bot' then
				if new.conversation_key <> current_user_id::text
					or new.sender_id <> 'bot'
					or not exists (
						select 1 from public.chat_messages prior
						where prior.conversation_key = new.conversation_key
							and prior.sender_role = 'client'
					) then
					raise exception using errcode = '42501', message = 'Chat message could not be verified.';
				end if;
			elsif new.conversation_key <> current_user_id::text
				or new.sender_role <> 'client'
				or new.sender_id <> current_user_id::text then
				raise exception using errcode = '42501', message = 'Chat message could not be verified.';
			end if;
			new.sender_name := coalesce(actor_name, 'Guest');
		else
			raise exception using errcode = '42501', message = 'Chat message could not be verified.';
		end if;
	end if;

	if left(message_text, length(media_prefix)) = media_prefix then
		begin
			message_text := coalesce((substring(message_text from length(media_prefix) + 1)::jsonb ->> 'content'), '');
			has_attachments := case
				when jsonb_typeof(substring(new.content from length(media_prefix) + 1)::jsonb -> 'attachments') = 'array'
				then jsonb_array_length(substring(new.content from length(media_prefix) + 1)::jsonb -> 'attachments') > 0
				else false
			end;
		exception when others then
			raise exception using errcode = '22023', message = 'Chat attachment message is invalid.';
		end;
	end if;

	if char_length(message_text) > 1200 then
		raise exception using errcode = '22023', message = 'Messages must be 1,200 characters or fewer.';
	end if;
	if length(trim(message_text)) = 0 and not has_attachments then
		raise exception using errcode = '22023', message = 'Write a message before sending.';
	end if;

	if new.sender_role <> 'bot' then
		select count(*) into recent_count
		from public.chat_messages prior
		where prior.sender_id = actor_id
			and prior.sender_role <> 'bot'
			and prior.created_at > now() - interval '1 minute';
		if recent_count >= 10 then
			raise exception using errcode = 'P0001', message = 'Too many messages sent; please wait a minute.';
		end if;

		if length(trim(message_text)) > 0 and exists (
			select 1 from public.chat_messages prior
			where prior.sender_id = actor_id
				and prior.sender_role <> 'bot'
				and prior.created_at > now() - interval '15 seconds'
				and lower(trim(prior.content)) = lower(trim(new.content))
		) then
			raise exception using errcode = 'P0001', message = 'Repeated message blocked. Please send a new message.';
		end if;
	end if;

	for previous_row in
		select prior.content
		from public.chat_messages prior
		where prior.conversation_key = new.conversation_key
			and prior.created_at > now() - interval '30 seconds'
		order by prior.created_at desc
		limit 4
	loop
		if left(previous_row.content, length(media_prefix)) = media_prefix then
			begin
				previous_text := coalesce(substring(previous_row.content from length(media_prefix) + 1)::jsonb ->> 'content', '') || ' ' || previous_text;
			exception when others then
				null;
			end;
		else
			previous_text := previous_row.content || ' ' || previous_text;
		end if;
	end loop;

	scan_text := regexp_replace(lower(translate(previous_text || ' ' || message_text, '@013457$!', 'aoieastsi')), '[^a-z0-9[:punct:][:space:]]', '', 'g');
	foreach term in array prohibited_terms loop
		pattern := '(^|[^a-z0-9])';
		char_index := 1;
		while char_index <= char_length(term) loop
			term_character := substr(term, char_index, 1);
			if term_character = ' ' then
				pattern := pattern || '[[:punct:][:space:]]+';
			else
				pattern := pattern || term_character || '+[[:punct:][:space:]]*';
			end if;
			char_index := char_index + 1;
		end loop;
		pattern := pattern || '([^a-z0-9]|$)';
		if scan_text ~* pattern then
			raise exception using errcode = '22023', message = 'Your message contains inappropriate language. Please use respectful language and keep it related to Hacienda Amara.';
		end if;
	end loop;
	if message_text ~* '(another|other|someone else.?s|all other).{0,80}(reservation|booking|profile|contact|email|phone|payment|personal details)'
		or message_text ~* '(show|reveal|give|list|tell me|print|repeat).{0,50}(system prompt|system instructions|secret key|api key|credentials|access token)'
		or message_text ~* '(ignore|bypass|override|forget).{0,40}(instructions|rules|guardrails|restrictions|system prompt)'
		or message_text ~* '(reveal|repeat|print|show).{0,40}(system prompt|hidden instructions)' then
		raise exception using errcode = '42501', message = 'For privacy and security, private customer details and internal system information cannot be shared.';
	end if;
	if message_text ~* '(homework|school assignment|essay|programming assignment|write code|debug my code|politics|political party|movie recommendation|celebrity gossip|song lyrics|capital of)'
		and message_text !~* '(website|reservation system|booking page|login page|chat page|account page)'
	then
		raise exception using errcode = '22023', message = 'I''m sorry, but I can only assist with questions and concerns related to Hacienda Amara Private Resort, including reservations, availability, pricing, facilities, and resort policies.';
	end if;

	topic_text := regexp_replace(lower(translate(message_text, '@013457$!', 'aoieastsi')), '[^a-z0-9[:punct:][:space:]]', '', 'g');
	if new.sender_role not in ('admin', 'staff', 'bot')
	and length(trim(message_text)) > 0
	and topic_text !~* topic_pattern
		and not (
			char_length(message_text) <= 100
			and lower(message_text) ~* '(^|[^a-z0-9])(what about|how about|and |what time|how much|how many|is it|are they|can we|can i|do you|does it|which one|that date|that day|sa weekend|sa weekdays|pwede ba|puwede ba|paano|saan|nasaan|ilan|magkano)([^a-z0-9]|$)'
			and lower(translate(previous_text, '@013457$!', 'aoieastsi')) ~* topic_pattern
		)
		and not (
			new.sender_role = 'bot'
			and lower(translate(previous_text, '@013457$!', 'aoieastsi')) ~* topic_pattern
		)
			and topic_text !~* '^[[:space:]]*(hi|hello|hey|good morning|good afternoon|good evening|thank you|thanks|salamat|sige|okay|ok|opo|po)[.!?[:space:]]*$' then
		raise exception using errcode = '22023', message = 'I''m sorry, but I can only assist with questions and concerns related to Hacienda Amara Private Resort, including reservations, availability, pricing, facilities, and resort policies.';
	end if;

	if message_text ~* '(.)\1{11,}'
		or (char_length(message_text) >= 32 and message_text ~ '^[A-Za-z]{32,}$' and lower(message_text) !~ '[aeiou]') then
		raise exception using errcode = '22023', message = 'That message looks like spam. Please send a clear Hacienda Amara question.';
	end if;

	new.created_at := now();
	return new;
end;
$$;

drop trigger if exists enforce_chat_message_guardrails on public.chat_messages;
create trigger enforce_chat_message_guardrails
	before insert on public.chat_messages
	for each row execute function public.enforce_chat_message_guardrails();

-- The chat API writes with the participant's own session, so the insert
-- privilege has to be available to anon and authenticated again. The trigger
-- above decides what each participant may write.
grant insert on public.chat_messages to anon, authenticated, service_role;
grant select on public.chat_messages to anon, authenticated, service_role;
grant update, delete on public.chat_messages to authenticated, service_role;
