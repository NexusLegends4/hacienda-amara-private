-- 1) Ensure required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create table (idempotent)
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    room_type TEXT NOT NULL,
    guests INTEGER NOT NULL,
    total_price NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3) Enable Realtime safely (only add if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reservations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations';
  END IF;
END $$;

-- 4) Enable RLS (idempotent)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 5) Policies
-- Note: CREATE POLICY isn't IF NOT EXISTS, so we drop then recreate to keep it idempotent.
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;

CREATE POLICY "Users can view own reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = profile_id
  );

CREATE POLICY "Users can insert own reservations"
  ON public.reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = profile_id
  );

CREATE POLICY "Admins can view all reservations"
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all reservations"
  ON public.reservations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'admin'
    )
  );

-- (Optional but common) If you will allow DELETE/UPDATE as well,
-- you likely also want corresponding policies for those operations.
-- Right now you only defined SELECT/INSERT/UPDATE.