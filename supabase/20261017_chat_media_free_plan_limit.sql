-- Supabase Free projects cannot upload files larger than 50 MiB.
-- Keep the bucket limit aligned with the plan's maximum.

update storage.buckets
set file_size_limit = 52428800
where id = 'chat-media';
