# Feedback and company research setup

Discover and the unused Tavily research endpoint have been removed. Company research still uses the configured AI provider and retains the notes UX and research render-crash fix. It does not use live web search. TAVILY_API_KEY is no longer read by application code; remove the retired secret from deployment configuration when deploying this change.

The old discovery SQL tables and historical migrations are not dropped by this change. They have no active search route. Existing workspace data is preserved; there is no bulk data cleanup migration.

Feedback needs SERVICE_RATE_SALT, FEEDBACK_TO_EMAIL, RESEND_API_KEY and AUTH_EMAIL_FROM, plus the existing SQL. Its protections remain 3 submissions/account/hour, 10/account/day, 10/IP/hour and 20 total/day, with duplicate prevention and field limits. The dedicated job-source request option has been removed; bug, suggestion and general feedback remain. Device access remains 2 approved devices with an 8-hour replacement cooldown. AI requests remain 31 credits each, Free 465 and Pro 25,110 per allowance period.

Nothing is pushed or deployed automatically. See `launch-fixes-2026-11-17.md` for billing gates and remaining provider decisions.
