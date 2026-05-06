-- Manual test helper for secure email-based access.
-- Replace the email/ref values, then run this in Supabase SQL Editor.
-- After inserting the grant:
-- 1. Send a magic link to the same email in JobSensei Settings.
-- 2. Open the link on the same device.
-- 3. account-status should auto-claim this grant and unlock hosted AI.

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
    'source', 'manual_test',
    'planSource', 'manual_test',
    'note', 'Temporary local test grant'
  )
)
on conflict (grant_type, external_ref)
do update set
  claim_email = excluded.claim_email,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = timezone('utc', now());

-- Cleanup example:
-- delete from public.plan_grants where grant_type = 'manual_test' and external_ref = 'manual-test-001';
