-- Read-only inspection. No data updates, grants, or function calls.
-- Run in the Supabase SQL editor to inspect deployed state before any repair.
-- Returns no emails, tokens, keys or raw payment payloads.

select plan_tier, plan_source, plan_status, credit_balance,
       credit_period_started_at, credit_period_ends_at, plan_expires_at,
       (credit_period_ends_at <= now()) as credit_period_elapsed,
       (plan_expires_at <= now()) as explicit_plan_expired,
       (plan_tier = 'pro' and plan_expires_at is null) as pro_without_expiry,
       count(*) as matching_accounts
from public.accounts
group by plan_tier, plan_source, plan_status, credit_balance,
         credit_period_started_at, credit_period_ends_at, plan_expires_at
order by plan_tier, plan_expires_at nulls first;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('accounts', 'device_registrations', 'plan_grants')
order by tablename, policyname;

-- Effective column privileges include table-level and inherited grants.
select c.table_name, c.column_name,
       has_column_privilege('authenticated', format('%I.%I', c.table_schema, c.table_name), c.column_name, 'UPDATE')
         as authenticated_can_update,
       has_column_privilege('anon', format('%I.%I', c.table_schema, c.table_name), c.column_name, 'UPDATE')
         as anon_can_update
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('accounts', 'device_registrations')
order by c.table_name, c.ordinal_position;

-- Inspect the routines actually installed, rather than assuming local migrations match.
select p.proname, pg_get_functiondef(p.oid) as installed_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('normalize_account_plan_state', 'consume_hosted_credits', 'refund_hosted_credits');
