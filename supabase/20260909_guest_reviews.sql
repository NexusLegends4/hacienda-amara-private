-- Allow customers who booked without an account to leave a review.
-- This migration also creates the table when the original Reviews Table.sql
-- migration has not been run yet.
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  reviewer_name text,
  rating numeric not null check (rating >= 0 and rating <= 5),
  comment text not null,
  media_url text,
  media_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint reviews_profile_id_key unique (profile_id)
);

alter table public.reviews
  alter column profile_id drop not null,
  add column if not exists reviewer_name text;

alter table public.reviews enable row level security;

drop policy if exists "Allow public read access" on public.reviews;
create policy "Allow public read access"
on public.reviews
for select
to public
using (true);

drop policy if exists "Allow users to manage own reviews" on public.reviews;
create policy "Allow users to manage own reviews"
on public.reviews
for all
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "Admins can manage all reviews" on public.reviews;
create policy "Admins can manage all reviews"
on public.reviews
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

alter table public.reviews
  drop constraint if exists reviews_reviewer_name_check;

alter table public.reviews
  add constraint reviews_reviewer_name_check check (length(trim(coalesce(reviewer_name, ''))) >= 2);

drop policy if exists "Allow anonymous review inserts" on public.reviews;
create policy "Allow anonymous review inserts"
on public.reviews
for insert
to anon
with check (
  profile_id is null
  and length(trim(coalesce(reviewer_name, ''))) >= 2
);

drop policy if exists "Allow anonymous inserts to review-media" on storage.objects;
create policy "Allow anonymous inserts to review-media"
on storage.objects
for insert
to anon
with check (bucket_id = 'review-media');