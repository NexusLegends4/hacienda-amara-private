-- 1. Create the reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    rating NUMERIC NOT NULL CHECK (rating >= 0 AND rating <= 5),
    comment TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS (idempotent)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 3. Drop conflicting policies (safe even if they don't exist)
DROP POLICY IF EXISTS "Allow public read access" ON public.reviews;
DROP POLICY IF EXISTS "Allow users to manage own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;

-- 4. Public read access (anon + authenticated)
CREATE POLICY "Allow public read access"
ON public.reviews
FOR SELECT
TO public
USING (true);

-- 5. Authenticated users can manage only their own rows
CREATE POLICY "Allow users to manage own reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- 6. Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);