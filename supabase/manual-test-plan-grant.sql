-- Manual tester/friend access helper for secure email-based access.
-- Replace the email/ref values, then run this in Supabase SQL Editor.
--
-- Important:
-- - accounts is the live source of truth once the person has a secure account.
-- - plan_grants is now only a delayed-claim / history helper.
-- - Use this only when the person has NOT signed in yet or when you want a
--   pending email-based Pro grant waiting for their first secure sign-in.
--
-- If the user has never signed in yet:
-- 1. Insert this grant.
-- 2. Send a magic link to the same email in JobSensei Settings.
-- 3. Open the link on the same device.
-- 4. account-status should claim this grant once and copy it into accounts.
--
-- If the user already signed in before:
-- - Prefer updating public.accounts directly instead of creating a new grant.
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
