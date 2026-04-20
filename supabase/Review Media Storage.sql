-- Drop existing policies first to avoid "already exists" errors
DROP POLICY IF EXISTS "Allow authenticated inserts to review-media"
ON storage.objects;

DROP POLICY IF EXISTS "Allow public select from review-media"
ON storage.objects;

-- 1) Allow authenticated (logged-in) users to upload into bucket_id = 'review-media'
CREATE POLICY "Allow authenticated inserts to review-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-media');

-- 2) Allow public to read objects from bucket_id = 'review-media'
CREATE POLICY "Allow public select from review-media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'review-media');