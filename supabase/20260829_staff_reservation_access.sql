-- Give staff read-only access to incoming reservations and booking activity.
-- Run after 20260829_guest_reservations.sql.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('client', 'staff', 'admin'));

-- Only an administrator can assign or change a role, including staff.
create or replace function public.enforce_profile_account_security()
returns trigger
language plpgsql
as $$
declare
  admin_user boolean := false;
begin
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) into admin_user;

  if tg_op = 'INSERT' then
    if new.role is null or not admin_user then new.role := 'client'; end if;
    new.deleted_at := null;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not admin_user then
      raise exception 'Only administrators can change profile roles.';
    end if;
    if new.deleted_at is distinct from old.deleted_at and not admin_user then
      raise exception 'Only administrators can delete or restore profiles.';
    end if;
    if old.deleted_at is not null and not admin_user then
      raise exception 'Deleted profiles cannot be modified by non-administrators.';
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists "Staff can view all reservations" on public.reservations;
create policy "Staff can view all reservations"
  on public.reservations
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );

drop policy if exists "Staff can read booking activity" on public.auth_notifications;
create policy "Staff can read booking activity"
  on public.auth_notifications
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );
