-- JobSensei secure auth bridge schema
-- Run after the existing telegram schema if you want to enable optional secure accounts.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  plan_status text not null default 'inactive' check (plan_status in ('inactive', 'active', 'grace', 'revoked')),
  plan_source text,
  legacy_code_hash text,
  linked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.device_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  device_label text,
  approved_at timestamptz,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, device_id)
);

create table if not exists public.plan_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_type text not null,
  external_ref text,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  route text not null,
  auth_mode text not null,
  provider text,
  model text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.accounts enable row level security;
alter table public.device_registrations enable row level security;
alter table public.plan_grants enable row level security;
alter table public.api_usage_events enable row level security;

create policy if not exists "accounts_select_own"
  on public.accounts
  for select
  using (auth.uid() = user_id);

create policy if not exists "accounts_update_own"
  on public.accounts
  for update
  using (auth.uid() = user_id);

create policy if not exists "devices_select_own"
  on public.device_registrations
  for select
  using (auth.uid() = user_id);

create policy if not exists "devices_update_own"
  on public.device_registrations
  for update
  using (auth.uid() = user_id);

create policy if not exists "plans_select_own"
  on public.plan_grants
  for select
  using (auth.uid() = user_id);

create policy if not exists "usage_select_own"
  on public.api_usage_events
  for select
  using (auth.uid() = user_id);
