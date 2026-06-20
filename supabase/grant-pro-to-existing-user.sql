-- Promote an already registered JobSensei user from Free to Pro.
--
-- Correct flow:
-- 1. The person signs in normally with the magic link and gets a Free account.
-- 2. You run this SQL with THEIR exact signed-in email.
-- 3. They refresh Settings or reopen the app while still signed in.
-- 4. JobSensei claims the grant, switches accounts.plan_tier to 'pro',
--    sets plan_source to 'manual_admin', and resets credit_balance to 53000.
--
-- Important:
-- - Do NOT manually edit accounts.plan_tier and expect it to stick.
-- - plan_grants is the source of truth; accounts is only the synced snapshot.
-- - claim_email must exactly match the user's signed-in email.
--
-- Replace these values before running:
-- - friend@example.com
-- - manual-pro-friend-001
--
-- Optional:
-- - add expiresAt if you want temporary Pro access
-- - keep status = 'active'

delete from public.plan_grants
where grant_type = 'manual_admin'
  and external_ref = 'manual-pro-friend-001';

insert into public.plan_grants (
  grant_type,
  external_ref,
  claim_email,
  status,
  metadata
)
values (
  'manual_admin',
  'manual-pro-friend-001',
  'friend@example.com',
  'active',
  jsonb_build_object(
    'planTier', 'pro',
    'planSource', 'manual_admin',
    'source', 'manual_admin',
    'note', 'Manual Pro access granted by admin'
    -- Optional:
    -- ,'expiresAt', '2026-07-20T00:00:00.000Z'
  )
);

-- Expected result after the next secure account refresh:
-- - plan_grants.user_id becomes the signed-in user id
-- - plan_grants.claimed_at is filled
-- - accounts.plan_tier becomes 'pro'
-- - accounts.plan_source becomes 'manual_admin'
-- - accounts.credit_balance becomes 53000
-- - accounts.credit_period_started_at / credit_period_ends_at reset for the new Pro window

