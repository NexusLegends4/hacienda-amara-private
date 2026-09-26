-- 1) Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create packages table (idempotent)
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    base_price NUMERIC NOT NULL DEFAULT 0,
    min_price NUMERIC NOT NULL DEFAULT 0,
    max_price NUMERIC NOT NULL DEFAULT 0,
    duration_hours INTEGER NOT NULL DEFAULT 9,
    check_in_time TIME NOT NULL DEFAULT '09:00',
    check_out_time TIME NOT NULL DEFAULT '18:00',
    max_guests INTEGER NOT NULL DEFAULT 20,
    additional_guest_price NUMERIC NOT NULL DEFAULT 200,
    features TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- 4) Policies
DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
CREATE POLICY "Public can view active packages"
    ON public.packages
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage packages" ON public.packages;
CREATE POLICY "Admin can manage packages"
    ON public.packages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5) Grant permissions
GRANT SELECT ON TABLE public.packages TO anon, authenticated;
GRANT ALL ON TABLE public.packages TO authenticated;

-- 6) Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 7) Trigger for updated_at
DROP TRIGGER IF EXISTS packages_updated_at ON public.packages;
CREATE TRIGGER packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Insert default packages (idempotent)
INSERT INTO public.packages (name, description, base_price, min_price, max_price, duration_hours, check_in_time, check_out_time, max_guests, additional_guest_price, features, display_order) VALUES
    ('Day Time (9 Hours)', 'Check In: 9:00 AM | Check Out: 6:00 PM', 6999, 6999, 7999, 9, '09:00', '18:00', 20, 200, '{"Check In: 9:00 AM", "Check Out: 6:00 PM", "Good for 20 Pax"}', 1),
    ('Night Time (9 Hours)', 'Check In: 9:00 PM | Check Out: 6:00 AM', 7999, 7999, 8999, 9, '21:00', '06:00', 20, 200, '{"Check In: 9:00 PM", "Check Out: 6:00 AM", "Good for 20 Pax"}', 2),
    ('Overnight (21 Hours)', 'Option 1: 9 AM - 6 AM | Option 2: 9 PM - 6 PM', 14999, 14999, 17999, 21, '09:00', '06:00', 20, 200, '{"Option 1: 9 AM - 6 AM", "Option 2: 9 PM - 6 PM", "Good for 20 Pax"}', 3)
ON CONFLICT (name) DO NOTHING;
