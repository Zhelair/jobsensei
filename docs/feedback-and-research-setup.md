# Feedback and protected research setup

These are local changes. Commit and deploy manually when ready.

1. Run `supabase/service-request-limits.sql` in Supabase SQL Editor.
2. Set server-only Vercel environment variables:
   - `FEEDBACK_TO_EMAIL`: your desired recipient (not a VITE_ variable).
   - `SERVICE_RATE_SALT`: a randomly generated secret, at least 32 random bytes.
   - Existing `RESEND_API_KEY` and verified `AUTH_EMAIL_FROM`/`RESEND_FROM_EMAIL` remain required.
3. Deploy manually and send a short feedback message from Account to verify delivery.

The recipient is not included in the frontend bundle or API responses. Replies use the authenticated account email, not an email submitted by the browser. Source requests receive a dedicated email subject. No attachments, transcripts, resumes or automatic diagnostics are sent.

Feedback limits: 3/account/hour, 10/account/day, 10/IP/hour, 20 total/day (a conservative feedback budget; review together with sign-in delivery limits). Duplicate content from the same account within a day is suppressed. Submission UUIDs and Resend idempotency keys prevent ordinary retry duplication. Ambiguous delivery failures are conservatively blocked from automatic re-sending; the user retains a copyable message. Bot challenges are not included in this first version.

Only hashed IP/content metadata, account IDs, request IDs, status and timestamps are stored in the rate-limit table. Metadata older than 32 days is purged on the next reservation. If the service is no longer used, remove old records with a maintenance job. Set an inbox retention policy separately (suggested: remove resolved feedback after 90 days).

Research requires a valid session but no Pro subscription or approved-device slot. BYOK AI-only research remains available when live search cannot be used. Limits: 10 live searches/account/hour, 30/IP/hour and 800 attempts/calendar month shared by this deployment. The shared budget is below Tavily's 1,000-credit free allowance; other uses of the Tavily key are not visible to this counter. Keep paid overages disabled in Tavily. Missing migration or salt fails closed for external searches and email sending.

Source URLs and checked dates are saved locally with company notes. Existing notes without provenance are not retroactively labelled web-verified. An AI summary is not guaranteed to ground every sentence in a listed source.

Job discovery remains a proposal. Suggested Applications navigation: Kanban / Workspace / Offers / Find jobs, with existing Stats accessible through a small secondary action. Do not remove Stats or claim LinkedIn/Jobs.bg automatic support before the source integration has been validated.
