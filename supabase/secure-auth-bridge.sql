-- JobSensei secure auth bridge schema
-- Run this in Supabase SQL Editor to enable secure accounts and hosted credit tracking.

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
  user_id uuid references auth.users(id) on delete cascade,
  grant_type text not null,
  external_ref text,
  claim_email text,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.plan_grants alter column user_id drop not null;
alter table public.plan_grants add column if not exists claim_email text;
alter table public.plan_grants add column if not exists claimed_at timestamptz;
alter table public.plan_grants add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists plan_grants_claim_email_idx on public.plan_grants (claim_email);
create index if not exists plan_grants_user_id_idx on public.plan_grants (user_id);
create unique index if not exists plan_grants_external_ref_idx
  on public.plan_grants (grant_type, external_ref)
  where external_ref is not null;

alter table public.accounts enable row level security;
alter table public.device_registrations enable row level security;
alter table public.plan_grants enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_select_own'
  ) then
    create policy "accounts_select_own"
      on public.accounts
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

alter table public.accounts
  add column if not exists plan_tier text check (plan_tier in ('free', 'pro'));

alter table public.accounts
  add column if not exists credit_balance integer check (credit_balance >= 0);

alter table public.accounts
  add column if not exists credit_period_started_at timestamptz;

alter table public.accounts
  add column if not exists credit_period_ends_at timestamptz;

alter table public.accounts
  add column if not exists plan_expires_at timestamptz;

create or replace function public.normalize_account_plan_state()
returns trigger
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_allowance integer;
  v_anchor timestamptz;
  v_should_reset boolean;
begin
  new.plan_tier := case
    when lower(coalesce(new.plan_tier, 'free')) = 'pro' then 'pro'
    else 'free'
  end;

  if new.plan_status is null or new.plan_status not in ('inactive', 'active', 'grace', 'revoked') then
    new.plan_status := 'active';
  elsif new.plan_status <> 'revoked' then
    new.plan_status := 'active';
  end if;

  if new.plan_tier = 'free' then
    new.plan_expires_at := null;
    if coalesce(nullif(trim(coalesce(new.plan_source, '')), ''), '') = '' then
      new.plan_source := 'free_magic_link';
    end if;
  else
    if coalesce(nullif(trim(coalesce(new.plan_source, '')), ''), '') = '' then
      new.plan_source := 'manual_admin';
    end if;
  end if;

  v_allowance := case when new.plan_tier = 'free' then 531 else 53000 end;
  if tg_op = 'INSERT' then
    v_should_reset := true;
  else
    v_should_reset := coalesce(old.plan_tier, '') is distinct from coalesce(new.plan_tier, '')
      or coalesce(old.plan_expires_at, 'epoch'::timestamptz) is distinct from coalesce(new.plan_expires_at, 'epoch'::timestamptz);
  end if;

  v_anchor := coalesce(new.credit_period_started_at, new.linked_at, new.created_at, v_now);

  if v_should_reset then
    new.credit_period_started_at := v_anchor;
    new.credit_period_ends_at := case
      when new.plan_tier = 'pro' and new.plan_expires_at is not null then new.plan_expires_at
      else v_anchor + make_interval(days => 31)
    end;
    new.credit_balance := v_allowance;
  else
    new.credit_period_started_at := coalesce(new.credit_period_started_at, v_anchor);
    new.credit_period_ends_at := coalesce(
      new.credit_period_ends_at,
      case
        when new.plan_tier = 'pro' and new.plan_expires_at is not null then new.plan_expires_at
        else new.credit_period_started_at + make_interval(days => 31)
      end
    );

    if new.plan_tier = 'pro' and new.plan_expires_at is not null and new.credit_period_ends_at > new.plan_expires_at then
      new.credit_period_ends_at := new.plan_expires_at;
    end if;

    if new.credit_balance is null or new.credit_balance < 0 then
      new.credit_balance := v_allowance;
    end if;
  end if;

  new.updated_at := v_now;
  return new;
end;
$$;

drop trigger if exists normalize_account_plan_state_before_write on public.accounts;
create trigger normalize_account_plan_state_before_write
before insert or update on public.accounts
for each row
execute function public.normalize_account_plan_state();

create table if not exists public.hosted_credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text,
  route text not null default 'proxy',
  provider text,
  model text,
  event_type text not null check (event_type in ('charge', 'refund')),
  credits_delta integer not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists hosted_credit_events_user_id_idx
  on public.hosted_credit_events (user_id, created_at desc);

create index if not exists hosted_credit_events_event_type_idx
  on public.hosted_credit_events (event_type, created_at desc);

alter table public.hosted_credit_events enable row level security;

create or replace function public.consume_hosted_credits(
  p_user_id uuid,
  p_device_id text default null,
  p_route text default 'proxy',
  p_provider text default 'deepseek',
  p_model text default 'deepseek-v4-flash',
  p_cost integer default 31
)
returns table (
  charged boolean,
  balance integer,
  error text,
  period_started_at timestamptz,
  period_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts%rowtype;
  v_allowance integer;
  v_balance integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_now timestamptz := timezone('utc', now());
begin
  if p_user_id is null then
    return query select false, null::integer, 'missing_user', null::timestamptz, null::timestamptz;
    return;
  end if;

  if coalesce(p_cost, 0) <= 0 then
    return query select false, null::integer, 'invalid_cost', null::timestamptz, null::timestamptz;
    return;
  end if;

  select *
  into v_account
  from public.accounts
  where user_id = p_user_id
  for update;

  if not found then
    return query select false, null::integer, 'account_not_found', null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_account.plan_status not in ('active', 'grace') then
    return query select false, coalesce(v_account.credit_balance, 0), 'inactive_plan', v_account.credit_period_started_at, v_account.credit_period_ends_at;
    return;
  end if;

  v_allowance := case when coalesce(v_account.plan_tier, 'pro') = 'free' then 531 else 53000 end;
  v_period_start := coalesce(v_account.credit_period_started_at, v_account.linked_at, v_account.created_at, v_now);
  v_period_end := coalesce(v_account.credit_period_ends_at, v_period_start + make_interval(days => 31));
  v_balance := greatest(coalesce(v_account.credit_balance, v_allowance), 0);

  while v_period_end <= v_now loop
    v_period_start := v_period_end;
    v_period_end := v_period_start + make_interval(days => 31);
    v_balance := v_allowance;
  end loop;

  if v_balance < p_cost then
    update public.accounts
    set
      credit_balance = v_balance,
      credit_period_started_at = v_period_start,
      credit_period_ends_at = v_period_end,
      updated_at = v_now
    where user_id = p_user_id;

    return query select false, v_balance, 'insufficient_credits', v_period_start, v_period_end;
    return;
  end if;

  v_balance := greatest(v_balance - p_cost, 0);

  update public.accounts
  set
    credit_balance = v_balance,
    credit_period_started_at = v_period_start,
    credit_period_ends_at = v_period_end,
    updated_at = v_now
  where user_id = p_user_id;

  insert into public.hosted_credit_events (
    user_id,
    device_id,
    route,
    provider,
    model,
    event_type,
    credits_delta,
    metadata
  ) values (
    p_user_id,
    nullif(p_device_id, ''),
    coalesce(nullif(p_route, ''), 'proxy'),
    nullif(p_provider, ''),
    nullif(p_model, ''),
    'charge',
    -p_cost,
    jsonb_build_object(
      'period_started_at', v_period_start,
      'period_ends_at', v_period_end
    )
  );

  return query select true, v_balance, null::text, v_period_start, v_period_end;
end;
$$;

create or replace function public.refund_hosted_credits(
  p_user_id uuid,
  p_device_id text default null,
  p_route text default 'proxy',
  p_provider text default 'deepseek',
  p_model text default 'deepseek-v4-flash',
  p_amount integer default 31,
  p_reason text default 'provider_error'
)
returns table (
  refunded boolean,
  balance integer,
  error text,
  period_started_at timestamptz,
  period_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.accounts%rowtype;
  v_allowance integer;
  v_balance integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_amount integer := greatest(coalesce(p_amount, 0), 0);
  v_now timestamptz := timezone('utc', now());
begin
  if p_user_id is null then
    return query select false, null::integer, 'missing_user', null::timestamptz, null::timestamptz;
    return;
  end if;

  if v_amount <= 0 then
    return query select false, null::integer, 'invalid_amount', null::timestamptz, null::timestamptz;
    return;
  end if;

  select *
  into v_account
  from public.accounts
  where user_id = p_user_id
  for update;

  if not found then
    return query select false, null::integer, 'account_not_found', null::timestamptz, null::timestamptz;
    return;
  end if;

  v_allowance := case when coalesce(v_account.plan_tier, 'pro') = 'free' then 531 else 53000 end;
  v_period_start := coalesce(v_account.credit_period_started_at, v_account.linked_at, v_account.created_at, v_now);
  v_period_end := coalesce(v_account.credit_period_ends_at, v_period_start + make_interval(days => 31));
  v_balance := greatest(coalesce(v_account.credit_balance, v_allowance), 0);

  while v_period_end <= v_now loop
    v_period_start := v_period_end;
    v_period_end := v_period_start + make_interval(days => 31);
    v_balance := v_allowance;
  end loop;

  v_balance := least(v_allowance, v_balance + v_amount);

  update public.accounts
  set
    credit_balance = v_balance,
    credit_period_started_at = v_period_start,
    credit_period_ends_at = v_period_end,
    updated_at = v_now
  where user_id = p_user_id;

  insert into public.hosted_credit_events (
    user_id,
    device_id,
    route,
    provider,
    model,
    event_type,
    credits_delta,
    reason,
    metadata
  ) values (
    p_user_id,
    nullif(p_device_id, ''),
    coalesce(nullif(p_route, ''), 'proxy'),
    nullif(p_provider, ''),
    nullif(p_model, ''),
    'refund',
    v_amount,
    coalesce(nullif(p_reason, ''), 'provider_error'),
    jsonb_build_object(
      'period_started_at', v_period_start,
      'period_ends_at', v_period_end
    )
  );

  return query select true, v_balance, null::text, v_period_start, v_period_end;
end;
$$;

revoke all on function public.consume_hosted_credits(uuid, text, text, text, text, integer) from public;
revoke all on function public.refund_hosted_credits(uuid, text, text, text, text, integer, text) from public;
grant execute on function public.consume_hosted_credits(uuid, text, text, text, text, integer) to service_role;
grant execute on function public.refund_hosted_credits(uuid, text, text, text, text, integer, text) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_update_own'
  ) then
    create policy "accounts_update_own"
      on public.accounts
      for update
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'device_registrations'
      and policyname = 'devices_select_own'
  ) then
    create policy "devices_select_own"
      on public.device_registrations
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'device_registrations'
      and policyname = 'devices_update_own'
  ) then
    create policy "devices_update_own"
      on public.device_registrations
      for update
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'plan_grants'
      and policyname = 'plans_select_own'
  ) then
    create policy "plans_select_own"
      on public.plan_grants
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;
