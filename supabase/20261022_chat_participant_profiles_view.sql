-- Expose the display details of chat participants without leaking private data.
--
-- The chat bubble shows the sender's name and picture. Guests and customers
-- could not see the staff picture because the row-level security policies on
-- public.profiles only let a user read their own row, and administrators read
-- every row. Those policies have to stay, because public.profiles also holds
-- private columns such as email and contact_number.
--
-- This view is owned by the database owner, so it is not filtered by the
-- profiles policies, but it only exposes the columns that are safe to show
-- next to a chat message: id, display name, avatar and role. Email addresses,
-- contact numbers and deleted accounts are never included.

create or replace view public.chat_participant_profiles
as
select
	p.id,
	p.firstname,
	p.lastname,
	p.avatar_url,
	p.role
from public.profiles p
where p.deleted_at is null;

grant select on public.chat_participant_profiles to anon, authenticated, service_role;

comment on view public.chat_participant_profiles is
	'Display-only chat participant details (name, avatar, role). Excludes email, contact number and deleted accounts.';
