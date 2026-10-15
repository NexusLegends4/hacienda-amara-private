-- Raise the private chat media bucket limit to 500 MiB.
-- Also set the project's global Storage file size limit to at least 500 MiB.

update storage.buckets
set file_size_limit = 524288000
where id = 'chat-media';
