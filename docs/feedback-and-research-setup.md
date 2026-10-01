# Feedback and protected research setup

These are local changes. Commit and deploy manually when ready.

Deployment packaging: Vercel Hobby allows 12 serverless functions. Feedback, company research and discovery now share `api/services.js`, with their existing public URLs preserved through `vercel.json` rewrites. Their underscore-prefixed handler files are bundled utilities, not separate endpoints. This leaves 12 deployable endpoint files. A regression test checks the routing and function budget. No SQL or environment-variable changes are needed for this packaging fix.

Current company-research UI uses the configured AI provider directly and no longer calls Tavily. The protected legacy research endpoint remains available for compatibility, but normal company research does not consume web-search credits. Research calls have a two-minute client timeout, hosted DeepSeek calls have a 90-second provider timeout, and account refreshes have a 15-second timeout. Completed AI replies no longer wait for an account-status refresh.

Discover now opens the existing Add form instead of silently saving a company-less card. Where titles contain an explicit company cue, it prefills a reviewable company hint; otherwise the company stays blank for the user to supply. A full JD is not inferred from a search snippet. Empty searches do not overwrite previous results or receive the 15-minute successful-search cache. Source-page dates are displayed separately from unverified LinkedIn posting dates.

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

Job discovery is now implemented locally under Applications → Discover. Existing statistics remain in a collapsed section below it. It uses the same TAVILY_API_KEY and research reservation budget (800 attempts/month shared with company research); no additional SQL migration is needed. A basic search costs one Tavily credit, regardless of whether ten valid listings are returned. Keep paid overages disabled.

The pilot searches indexed public LinkedIn vacancy pages or Greenhouse/Lever company-board pages through Tavily. It does not access LinkedIn sessions, crawl LinkedIn directly, or implement a Jobs.bg connector. It retrieves up to 20 search results and shows up to ten after URL validation, local keyword ranking and deduplication. Coverage, freshness and whether a vacancy is still open require confirmation on the original listing. Search recency refers to search-index dates, not verified job posting dates.

Recent results are reused locally for 15 minutes for identical preferences. Preferences, results and viewed/dismissed status are stored per project in this browser. Saved application URLs are matched by source job ID, including tracked/country-specific LinkedIn URLs. Saving records an excerpt in notes, not a full job description; company details can be added after reviewing the original page. No resume or AI request is sent by Discover.

Feedback is a general Account feature, not limited to source requests. The Account top button scrolls to its form below the account panels. Production must include the commit: a commit on Codex_123 does not update a deployment configured for main. Environment-variable changes apply to new deployments, not an already running deployment. Test email delivery after manually deploying the intended commit.
