-- Let staff read every reservation, not just administrators.
--
-- The QR scanner (src/pages/ScanQr.jsx) reads a reservation with the signed-in
-- user's own session, so the row-level security policy decides the result.
-- "Admins can view all reservations" only covers role = 'admin', which meant a
-- staff member scanning a guest's booking QR code was told the booking was
-- not found. Staff already have update and delete access to every reservation,
-- so this only closes the read gap.

drop policy if exists "Staff can view all reservations" on public.reservations;

create policy "Staff can view all reservations"
	on public.reservations
	for select
	to authenticated
	using (
		exists (
			select 1
			from public.profiles
			where id = auth.uid()
				and role in ('admin', 'staff')
		)
	);
