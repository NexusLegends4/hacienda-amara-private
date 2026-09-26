-- 1) Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'reservation',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Helpful index for "my notifications"
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id_created_at
ON public.notifications (profile_id, created_at DESC);

-- 2) Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3) Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = profile_id);
  END IF;
END $$;

-- Optional: allow users to update only their own notifications (e.g., mark as read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = profile_id)
    WITH CHECK ((SELECT auth.uid()) = profile_id);
  END IF;
END $$;

-- (Optional) If you also want clients to insert notifications manually:
-- DO $$ BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can insert own notifications'
--   ) THEN
--     CREATE POLICY "Users can insert own notifications"
--     ON public.notifications
--     FOR INSERT
--     TO authenticated
--     WITH CHECK ((SELECT auth.uid()) = profile_id);
--   END IF;
-- END $$;

-- 4) Auto-notification function for reservation updates
CREATE OR REPLACE FUNCTION public.on_reservation_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only insert when status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (profile_id, message, type)
    VALUES (
      NEW.profile_id,
      CASE
        WHEN NEW.status = 'confirmed' THEN
          'Good news! Your reservation for ' || NEW.room_type || ' on ' || NEW.check_in || ' has been accepted!'
        WHEN NEW.status = 'cancelled' THEN
          'We regret to inform you that your reservation for ' || NEW.room_type || ' on ' || NEW.check_in || ' was cancelled.'
        ELSE
          'Your reservation status has been updated to ' || NEW.status
      END,
      'reservation'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Important: lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.on_reservation_status_update() FROM PUBLIC;

-- 5) Trigger
DROP TRIGGER IF EXISTS tr_reservation_status_update ON public.reservations;

CREATE TRIGGER tr_reservation_status_update
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.on_reservation_status_update();

-- 6) Enable Realtime for notifications (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;