-- Apply after account-billing-hardening.sql. No external payments are changed.
begin;
create table if not exists public.billing_refunded_transactions (
  transaction_id text primary key, subscription_id text not null,
  adjustment_id text not null, refunded_at timestamptz not null
);
alter table public.billing_refunded_transactions enable row level security;
revoke all on public.billing_refunded_transactions from public, anon, authenticated;
grant all on public.billing_refunded_transactions to service_role;

-- Keep the existing paid-period implementation, adding a refund replay guard.
do $$ begin
  if to_regprocedure('public.apply_paddle_billing_event_base(text,timestamptz,jsonb,jsonb)') is null then
    alter function public.apply_paddle_billing_event(text,timestamptz,jsonb,jsonb)
      rename to apply_paddle_billing_event_base;
  end if;
end $$;
create or replace function public.apply_paddle_billing_event(
  p_event_id text, p_occurred_at timestamptz, p_subscription jsonb, p_transaction jsonb default null
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_subscription->>'id',0));
  if p_transaction is not null and exists (
    select 1 from billing_refunded_transactions where transaction_id=p_transaction->>'id'
  ) then
    return jsonb_build_object('skipped',true,'reason','refunded_transaction');
  end if;
  return apply_paddle_billing_event_base(p_event_id,p_occurred_at,p_subscription,p_transaction);
end $$;
revoke all on function public.apply_paddle_billing_event(text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_paddle_billing_event(text,timestamptz,jsonb,jsonb) to service_role;
revoke all on function public.apply_paddle_billing_event_base(text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_paddle_billing_event_base(text,timestamptz,jsonb,jsonb) to service_role;

create or replace function public.apply_paddle_adjustment(
  p_event_id text, p_occurred_at timestamptz,
  p_subscription jsonb, p_transaction jsonb, p_adjustment jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_id text := p_subscription->>'id';
  v_sub public.billing_subscriptions%rowtype;
  v_end timestamptz := (p_transaction->'billing_period'->>'ends_at')::timestamptz;
  v_revoked boolean := false;
begin
  if p_adjustment->>'status' <> 'approved' or p_adjustment->>'action' not in ('refund','chargeback') then
    return jsonb_build_object('skipped',true);
  end if;
  if p_adjustment->>'transaction_id' is distinct from p_transaction->>'id'
    or p_transaction->>'subscription_id' is distinct from v_id
    or p_adjustment->>'customer_id' is distinct from p_subscription->>'customer_id' then
    raise exception 'Adjustment binding mismatch';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_id,0));
  if exists(select 1 from billing_events where event_id=p_event_id) then
    return jsonb_build_object('duplicate',true);
  end if;
  -- Establish ownership even if the approved refund arrives before the paid event.
  perform apply_paddle_billing_event_base(p_event_id,p_occurred_at,p_subscription,null);
  select * into v_sub from billing_subscriptions where subscription_id=v_id for update;
  -- Partial goodwill refunds retain access and are reviewed by the operator.
  if p_adjustment->>'type' is distinct from 'full' then
    return jsonb_build_object('ok',true,'partial',true,'revoked',false);
  end if;
  if v_end is null then raise exception 'Refund billing period missing'; end if;
  insert into billing_refunded_transactions values(
    p_transaction->>'id',v_id,p_adjustment->>'id',p_occurred_at
  ) on conflict(transaction_id) do nothing;
  -- An older-period refund must not revoke a later paid renewal or another subscription.
  if v_sub.paid_until = v_end and v_sub.user_id is not null and not v_sub.deletion_requested then
    update accounts set plan_tier='free',plan_status='active',plan_source='free_magic_link',
      plan_expires_at=null,credit_balance=least(credit_balance,465),
      credit_period_started_at=now(),credit_period_ends_at=now()+interval '31 days'
      where user_id=v_sub.user_id and plan_source='paddle_webhook'
      and plan_expires_at=v_end
      and not exists(select 1 from billing_subscriptions s
        where s.user_id=v_sub.user_id and s.subscription_id<>v_id and s.paid_until>now()
        and not s.deletion_requested);
    v_revoked := found;
  end if;
  update billing_subscriptions set paid_until=null where subscription_id=v_id and paid_until=v_end;
  return jsonb_build_object('ok',true,'revoked',v_revoked);
end $$;
revoke all on function public.apply_paddle_adjustment(text,timestamptz,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_paddle_adjustment(text,timestamptz,jsonb,jsonb,jsonb) to service_role;
commit;
