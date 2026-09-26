-- Allow staff to perform the same per-reservation actions as administrators.
-- Run after 20260829_staff_reservation_access.sql.

drop policy if exists "Staff can update all reservations" on public.reservations;
create policy "Staff can update all reservations"
  on public.reservations
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );

drop policy if exists "Staff can delete all reservations" on public.reservations;
create policy "Staff can delete all reservations"
  on public.reservations
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );

drop policy if exists "Staff can delete auth notifications" on public.auth_notifications;
create policy "Staff can delete auth notifications"
  on public.auth_notifications
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );