DROP POLICY IF EXISTS "Admins can delete all" ON public.reservations;

CREATE POLICY "Admins can delete all" ON public.reservations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);