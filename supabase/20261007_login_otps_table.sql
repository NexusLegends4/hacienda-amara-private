-- Login OTP table for email verification
-- Run this in Supabase SQL Editor

create table if not exists public.login_otps (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    email text not null,
    otp_hash text not null,
    expires_at timestamptz not null,
    attempts integer not null default 0,
    verified boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists login_otps_user_id_verified_idx
on public.login_otps (user_id, verified);

create index if not exists login_otps_expires_at_idx
on public.login_otps (expires_at);

alter table public.login_otps enable row level security;

-- Service role only access (edge functions use service role key)
drop policy if exists "Service role full access" on public.login_otps;
create policy "Service role full access"
on public.login_otps
for all
to service_role
using (true)
with check (true);

-- Auto-cleanup old OTPs (optional - can be run via pg_cron or manually)
-- delete from public.login_otps where expires_at < now() - interval '1 day';