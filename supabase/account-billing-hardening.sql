-- Apply AFTER secure-auth-bridge.sql and secure-hosted-credits.sql.
-- No legacy balances are changed by this migration. Run the diagnostic SELECTs
-- first; finite legacy expiry enforcement occurs on the next authenticated access.
begin;

alter table public.accounts add column if not exists deletion_requested_at timestamptz;

create table if not exists public.secure_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text, action text not null, metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists public.billing_checkouts (
  id uuid primary key, user_id uuid references auth.users(id) on delete set null,
  transaction_id text unique, created_at timestamptz not null default now()
);
create table if not exists public.billing_subscriptions (
  subscription_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  customer_id text not null, status text not null,
  paid_until timestamptz, scheduled_change jsonb,
  last_event_at timestamptz not null,
  deletion_requested boolean not null default false
);
create table if not exists public.billing_events (
  event_id text primary key, occurred_at timestamptz not null,
  subscription_id text not null, processed_at timestamptz not null default now()
);
alter table public.secure_audit_events enable row level security;
alter table public.billing_checkouts enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;

create table if not exists public.discovery_search_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null, result jsonb, checked_at timestamptz,
  lease_id uuid, lease_until timestamptz,
  primary key(user_id,fingerprint)
);
create table if not exists public.discovery_search_requests (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists discovery_requests_user_time on public.discovery_search_requests(user_id,created_at);
alter table public.discovery_search_cache enable row level security;
alter table public.discovery_search_requests enable row level security;
revoke all on public.discovery_search_cache, public.discovery_search_requests from anon, authenticated;
grant all on public.discovery_search_cache, public.discovery_search_requests to service_role;

create or replace function public.reserve_discovery_search(p_user_id uuid,p_fingerprint text,p_lease_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cached public.discovery_search_cache%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,1));
  if not exists(select 1 from public.accounts where user_id=p_user_id and deletion_requested_at is null) then
    return jsonb_build_object('status','account_unavailable');
  end if;
  delete from public.discovery_search_requests where user_id=p_user_id and created_at<now()-interval '24 hours';
  delete from public.discovery_search_cache where user_id=p_user_id and
    (checked_at<now()-interval '1 day' or (checked_at is null and lease_until<now()));
  select * into v_cached from public.discovery_search_cache where user_id=p_user_id and fingerprint=p_fingerprint for update;
  if v_cached.result is not null and v_cached.checked_at > now()-interval '15 minutes' then
    return jsonb_build_object('status','cached','result',v_cached.result);
  end if;
  if v_cached.lease_until > now() then return jsonb_build_object('status','busy'); end if;
  if (select count(*) from public.discovery_search_requests where user_id=p_user_id and created_at>now()-interval '1 hour') >= 20
    or (select count(*) from public.discovery_search_requests where user_id=p_user_id and created_at>now()-interval '24 hours') >= 100 then
    return jsonb_build_object('status','limited');
  end if;
  insert into public.discovery_search_requests(id,user_id) values(p_lease_id,p_user_id);
  insert into public.discovery_search_cache(user_id,fingerprint,lease_id,lease_until)
    values(p_user_id,p_fingerprint,p_lease_id,now()+interval '30 seconds')
    on conflict(user_id,fingerprint) do update set lease_id=excluded.lease_id,lease_until=excluded.lease_until;
  return jsonb_build_object('status','reserved');
end;
$$;
revoke all on function public.reserve_discovery_search(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_discovery_search(uuid,text,uuid) to service_role;

-- RLS row ownership alone does not protect sensitive columns from UPDATE.
-- All writes are performed by service-role handlers, including device naming.
revoke insert, update, delete, truncate, references, trigger on
  public.accounts, public.device_registrations, public.plan_grants,
  public.hosted_credit_events from public, anon, authenticated;
-- Remove explicit column grants too: table-level REVOKE does not remove them.
do $$ declare r record; begin
  for r in select table_name,column_name from information_schema.columns
    where table_schema='public' and table_name in ('accounts','device_registrations','plan_grants','hosted_credit_events') loop
    execute format('revoke insert (%I), update (%I), references (%I) on public.%I from public, anon, authenticated',r.column_name,r.column_name,r.column_name,r.table_name);
  end loop;
end $$;
revoke all on public.secure_audit_events, public.billing_checkouts,
  public.billing_subscriptions, public.billing_events from anon, authenticated;
grant all on public.secure_audit_events, public.billing_checkouts,
  public.billing_subscriptions, public.billing_events to service_role;

create or replace function public.reserve_billing_checkout(p_user_id uuid,p_checkout_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_checkout public.billing_checkouts%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,2));
  if not exists(select 1 from public.accounts where user_id=p_user_id and deletion_requested_at is null) then
    return jsonb_build_object('status','unavailable');
  end if;
  if exists(select 1 from public.billing_subscriptions where user_id=p_user_id and status<>'canceled') then
    return jsonb_build_object('status','existing_subscription');
  end if;
  select * into v_checkout from public.billing_checkouts where user_id=p_user_id
    and created_at>now()-interval '30 minutes' order by created_at desc limit 1;
  if found and v_checkout.transaction_id is not null then
    return jsonb_build_object('status','reused','transactionId',v_checkout.transaction_id);
  end if;
  if found and v_checkout.created_at>now()-interval '30 seconds' then
    return jsonb_build_object('status','busy');
  end if;
  insert into public.billing_checkouts(id,user_id) values(p_checkout_id,p_user_id);
  return jsonb_build_object('status','reserved');
end;
$$;
revoke all on function public.reserve_billing_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_billing_checkout(uuid,uuid) to service_role;

create or replace function public.apply_paddle_billing_event(
  p_event_id text, p_occurred_at timestamptz,
  p_subscription jsonb, p_transaction jsonb default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id text := p_subscription->>'id';
  v_owner uuid;
  v_checkout public.billing_checkouts%rowtype;
  v_sub public.billing_subscriptions%rowtype;
  v_account public.accounts%rowtype;
  v_end timestamptz;
  v_start timestamptz;
  v_reset boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_id, 0));
  if exists(select 1 from public.billing_events where event_id = p_event_id) then
    return jsonb_build_object('duplicate', true);
  end if;
  select * into v_sub from public.billing_subscriptions where subscription_id = v_id for update;
  v_owner := v_sub.user_id;
  if not found then
    select * into v_checkout from public.billing_checkouts
      where id::text = p_subscription->'custom_data'->>'jobsensei_checkout_id' for update;
    if not found then raise exception 'Unknown checkout binding'; end if;
    v_owner := v_checkout.user_id;
    -- An initial paid event must originate from the server-created transaction.
    if p_transaction is not null and p_transaction->>'id' is distinct from v_checkout.transaction_id then
      raise exception 'Transaction binding mismatch';
    end if;
    insert into public.billing_subscriptions(subscription_id,user_id,customer_id,status,last_event_at)
      values(v_id,v_owner,p_subscription->>'customer_id',p_subscription->>'status',p_occurred_at);
    select * into v_sub from public.billing_subscriptions where subscription_id = v_id for update;
  end if;
  if v_sub.customer_id is distinct from p_subscription->>'customer_id' then
    raise exception 'Customer binding mismatch';
  end if;
  select * into v_account from public.accounts where user_id = v_owner for update;
  if v_owner is null or v_sub.deletion_requested or v_account.deletion_requested_at is not null then
    insert into public.billing_events values(p_event_id,p_occurred_at,v_id,now());
    return jsonb_build_object('retired', true);
  end if;
  if v_account.user_id is null then raise exception 'Account missing'; end if;
  if p_occurred_at >= v_sub.last_event_at then
    update public.billing_subscriptions set status=p_subscription->>'status',
      scheduled_change=p_subscription->'scheduled_change', last_event_at=p_occurred_at where subscription_id=v_id;
  end if;
  -- Allowances are granted only for completed, paid billing periods. Ordinary
  -- subscription.updated events (including cancel-at-end) never refill credits.
  if p_transaction is not null and p_subscription->>'status' <> 'canceled' then
    v_end := (p_transaction->'billing_period'->>'ends_at')::timestamptz;
    v_start := (p_transaction->'billing_period'->>'starts_at')::timestamptz;
    if v_end is null or v_start is null then raise exception 'Paid billing period missing'; end if;
    if v_end > now() and (v_sub.paid_until is null or v_end > v_sub.paid_until) then
      v_reset := v_sub.paid_until is null or v_account.plan_tier <> 'pro' or v_start >= v_sub.paid_until;
      update public.billing_subscriptions set paid_until=v_end where subscription_id=v_id;
      update public.accounts set plan_tier='pro',plan_status='active',plan_source='paddle_webhook',
        plan_expires_at=v_end,
        credit_balance=case when v_reset then 25110 else credit_balance end,
        credit_period_started_at=case when v_reset then v_start else credit_period_started_at end,
        credit_period_ends_at=case when v_reset then v_end else credit_period_ends_at end
        where user_id=v_owner;
    end if;
  elsif p_subscription->>'status' = 'canceled' and v_account.plan_source='paddle_webhook' then
    update public.accounts set plan_tier='free',plan_source='free_magic_link',plan_expires_at=null,
      credit_balance=465,credit_period_started_at=now(),credit_period_ends_at=now()+interval '31 days'
      where user_id=v_owner;
  end if;
  insert into public.billing_events values(p_event_id,p_occurred_at,v_id,now());
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.apply_paddle_billing_event(text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_paddle_billing_event(text,timestamptz,jsonb,jsonb) to service_role;
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

  v_allowance := case when new.plan_tier = 'free' then 465 else 25110 end;
  if tg_op = 'INSERT' then
    v_should_reset := true;
  else
    v_should_reset := coalesce(old.plan_tier, '') is distinct from coalesce(new.plan_tier, '')
      or coalesce(old.credit_period_started_at, 'epoch'::timestamptz) is distinct from coalesce(new.credit_period_started_at, 'epoch'::timestamptz);
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

  if v_account.deletion_requested_at is not null then
    return query select false, coalesce(v_account.credit_balance, 0), 'account_deleting', v_account.credit_period_started_at, v_account.credit_period_ends_at;
    return;
  end if;
  if v_account.plan_tier = 'pro' and (
    v_account.plan_expires_at <= v_now or
    (v_account.plan_expires_at is null and v_account.plan_source in ('bmac_webhook','paddle_webhook')
      and coalesce(v_account.credit_period_ends_at, v_now) <= v_now)
  ) then
    update public.accounts set plan_tier='free', plan_source='free_magic_link', plan_expires_at=null,
      credit_balance=465, credit_period_started_at=v_now, credit_period_ends_at=v_now+interval '31 days'
      where user_id=p_user_id returning * into v_account;
  end if;

  v_allowance := case when coalesce(v_account.plan_tier, 'pro') = 'free' then 465 else 25110 end;
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
commit;
