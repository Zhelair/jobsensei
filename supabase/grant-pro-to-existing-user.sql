-- Promote an already registered JobSensei user from Free to Pro.
--
-- New model:
-- - public.accounts is the live source of truth for plan + credits.
-- - public.plan_grants is only optional history / delayed-claim support.
--
-- Use this when the user has already signed in at least once and has an
-- accounts row. The trigger from secure-auth-bridge.sql will reset credits
-- and the credit window automatically when plan_tier / plan_expires_at change.
--
-- Replace these values before running:
-- - friend@example.com
-- - 2026-07-20T00:00:00.000Z

update public.accounts
set
  plan_tier = 'pro',
  plan_source = 'manual_admin',
  plan_expires_at = '2026-07-20T00:00:00.000Z',
  updated_at = timezone('utc', now())
where lower(email) = lower('friend@example.com');

-- Expected result:
-- - accounts.plan_tier becomes 'pro'
-- - accounts.plan_source becomes 'manual_admin'
-- - accounts.plan_expires_at becomes your chosen Pro end date
-- - credits reset to the Pro monthly allowance automatically
