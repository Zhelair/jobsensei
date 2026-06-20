-- Manual tester/friend access helper for secure email-based access.
-- Replace the email/ref values, then run this in Supabase SQL Editor.
--
-- Important:
-- - plan_grants is the source of truth for hosted access.
-- - accounts is only the synced/cached account snapshot.
-- - You can create this grant before OR after the user signs in.
--
-- If the user has never signed in yet:
-- 1. Insert this grant.
-- 2. Send a magic link to the same email in JobSensei Settings.
-- 3. Open the link on the same device.
-- 4. account-status should auto-claim this grant and sync the account to Pro.
--
-- If the user already signed in before:
-- 1. Insert this grant.
-- 2. Refresh Settings or re-open the app while signed in.
-- 3. account-status should claim the unclaimed grant on the next secure refresh.
--
-- This script deletes the old manual test row first so it works even if
-- your database doesn't infer the partial unique index for ON CONFLICT.

delete from public.plan_grants
where grant_type = 'manual_test'
  and external_ref = 'manual-test-001';

insert into public.plan_grants (
  grant_type,
  external_ref,
  claim_email,
  status,
  metadata
)
values (
  'manual_test',
  'manual-test-001',
  'replace-me@example.com',
  'active',
  jsonb_build_object(
    'planTier', 'pro',
    'source', 'manual_test',
    'planSource', 'manual_test',
    'note', 'Temporary manual Pro grant for tester/friend access'
    -- Optional:
    -- ,'expiresAt', '2026-07-20T00:00:00.000Z'
  )
);

-- Cleanup example:
-- delete from public.plan_grants where grant_type = 'manual_test' and external_ref = 'manual-test-001';
