-- Safe preflight: SELECTs only. Run in the JobSensei project's SQL Editor.
-- All rows should report installed = true after account-billing-hardening.sql.
select 'accounts' as requirement, to_regclass('public.accounts') is not null as installed
union all
select 'device_registrations', to_regclass('public.device_registrations') is not null
union all
select 'plan_grants', to_regclass('public.plan_grants') is not null
union all
select 'hosted_credit_events', to_regclass('public.hosted_credit_events') is not null
union all
select 'accounts.deletion_requested_at', exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='accounts' and column_name='deletion_requested_at'
)
union all
select 'billing_subscriptions', to_regclass('public.billing_subscriptions') is not null
union all
select 'discovery_search_cache', to_regclass('public.discovery_search_cache') is not null
union all
select 'apply_paddle_billing_event', to_regprocedure('public.apply_paddle_billing_event(text,timestamp with time zone,jsonb,jsonb)') is not null
union all
select 'reserve_billing_checkout', to_regprocedure('public.reserve_billing_checkout(uuid,uuid)') is not null
union all
select 'reserve_discovery_search', to_regprocedure('public.reserve_discovery_search(uuid,text,uuid)') is not null;
