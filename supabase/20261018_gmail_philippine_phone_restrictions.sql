-- Restrict account and contact details to Gmail and +63 Philippine mobile numbers.
-- Existing rows are left untouched; validation applies to new accounts and changed contact fields.

create or replace function public.enforce_gmail_philippine_contacts()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  new_row jsonb := to_jsonb(new);
  old_row jsonb := '{}'::jsonb;
  email_value text;
  phone_value text;
  profile_value text;
  email_changed boolean;
  phone_changed boolean;
begin
  if tg_op = 'UPDATE' then
    old_row := to_jsonb(old);
  end if;

  if tg_table_schema = 'auth' and tg_table_name = 'users' then
    email_value := new_row ->> 'email';
    email_changed := tg_op = 'INSERT' or email_value is distinct from (old_row ->> 'email');
    if email_changed
      and email_value is not null
      and lower(btrim(email_value)) !~ '^[a-z0-9._%+-]+@gmail[.]com$' then
      raise exception 'Only @gmail.com accounts are allowed.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if tg_table_name = 'profiles' then
    email_value := new_row ->> 'email';
    phone_value := new_row ->> 'contact_number';
    email_changed := tg_op = 'INSERT' or email_value is distinct from (old_row ->> 'email');
    phone_changed := tg_op = 'INSERT' or phone_value is distinct from (old_row ->> 'contact_number');

    if email_changed
      and nullif(btrim(email_value), '') is not null
      and lower(btrim(email_value)) !~ '^[a-z0-9._%+-]+@gmail[.]com$' then
      raise exception 'Profile email must use @gmail.com.'
        using errcode = '23514';
    end if;
    if phone_changed
      and nullif(btrim(phone_value), '') is not null
      and btrim(phone_value) !~ '^[+]639[0-9]{9}$' then
      raise exception 'Contact number must use +639XXXXXXXXX format.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if tg_table_name in ('reservations', 'registrations') then
    profile_value := new_row ->> 'profile_id';
    email_value := new_row ->> 'guest_email';
    phone_value := new_row ->> 'guest_phone';
    email_changed := tg_op = 'INSERT' or email_value is distinct from (old_row ->> 'guest_email');
    phone_changed := tg_op = 'INSERT' or phone_value is distinct from (old_row ->> 'guest_phone');

    if profile_value is null and (email_changed or phone_changed) then
      if nullif(btrim(email_value), '') is null
        or lower(btrim(email_value)) !~ '^[a-z0-9._%+-]+@gmail[.]com$' then
        raise exception 'Guest email must use @gmail.com.'
          using errcode = '23514';
      end if;
      if phone_value is null or btrim(phone_value) !~ '^[+]639[0-9]{9}$' then
        raise exception 'Guest phone must use +639XXXXXXXXX format.'
          using errcode = '23514';
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_gmail_account_email on auth.users;
create trigger enforce_gmail_account_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_gmail_philippine_contacts();

drop trigger if exists enforce_gmail_profile_contacts on public.profiles;
create trigger enforce_gmail_profile_contacts
  before insert or update of email, contact_number on public.profiles
  for each row execute function public.enforce_gmail_philippine_contacts();

drop trigger if exists enforce_gmail_reservation_contacts on public.reservations;
create trigger enforce_gmail_reservation_contacts
  before insert or update of profile_id, guest_email, guest_phone on public.reservations
  for each row execute function public.enforce_gmail_philippine_contacts();

drop trigger if exists enforce_gmail_registration_contacts on public.registrations;
create trigger enforce_gmail_registration_contacts
  before insert or update of profile_id, guest_email, guest_phone on public.registrations
  for each row execute function public.enforce_gmail_philippine_contacts();
