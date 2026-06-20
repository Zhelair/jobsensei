-- One-time migration helper:
-- copy currently active plan_grants into public.accounts so accounts becomes
-- the live source of truth before the new runtime goes live.
--
-- Run secure-auth-bridge.sql first so accounts.plan_expires_at and the
-- normalize_account_plan_state trigger already exist.

with ranked_grants as (
  select
    a.user_id,
    a.email,
    pg.grant_type,
    pg.created_at,
    coalesce(
      nullif(pg.metadata ->> 'planTier', ''),
      nullif(pg.metadata ->> 'tier', ''),
      nullif(pg.metadata ->> 'plan_tier', ''),
      'pro'
    ) as plan_tier,
    coalesce(
      nullif(pg.metadata ->> 'planSource', ''),
      nullif(pg.metadata ->> 'source', ''),
      pg.grant_type
    ) as plan_source,
    coalesce(
      nullif(pg.metadata ->> 'expiresAt', ''),
      nullif(pg.metadata ->> 'expires_at', ''),
      nullif(pg.metadata ->> 'periodEndsAt', ''),
      nullif(pg.metadata ->> 'period_ends_at', ''),
      nullif(pg.metadata ->> 'planExpiresAt', ''),
      nullif(pg.metadata ->> 'plan_expires_at', '')
    )::timestamptz as plan_expires_at,
    row_number() over (
      partition by a.user_id
      order by
        coalesce(
          coalesce(
            nullif(pg.metadata ->> 'expiresAt', ''),
            nullif(pg.metadata ->> 'expires_at', ''),
            nullif(pg.metadata ->> 'periodEndsAt', ''),
            nullif(pg.metadata ->> 'period_ends_at', ''),
            nullif(pg.metadata ->> 'planExpiresAt', ''),
            nullif(pg.metadata ->> 'plan_expires_at', '')
          )::timestamptz,
          pg.created_at + make_interval(days => 31)
        ) desc,
        pg.created_at desc
    ) as rn
  from public.plan_grants pg
  join public.accounts a
    on (
      (pg.user_id is not null and pg.user_id = a.user_id)
      or (pg.user_id is null and lower(pg.claim_email) = lower(a.email))
    )
  where pg.status = 'active'
)
update public.accounts a
set
  plan_tier = case when lower(ranked_grants.plan_tier) = 'free' then 'free' else 'pro' end,
  plan_source = ranked_grants.plan_source,
  plan_expires_at = case
    when lower(ranked_grants.plan_tier) = 'free' then null
    else ranked_grants.plan_expires_at
  end,
  updated_at = timezone('utc', now())
from ranked_grants
where ranked_grants.rn = 1
  and ranked_grants.user_id = a.user_id;
