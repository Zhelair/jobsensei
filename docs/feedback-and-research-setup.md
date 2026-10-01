# Feedback and Discover setup

Discover uses server-only TAVILY_API_KEY. Company research uses the configured AI provider and retains the research render-crash fix.

No application-added hourly account/IP search limits or monthly spending cap apply. Search endpoints no longer call the SQL limiter, so no new SQL is needed to unblock discovery after deployment. The migration source removes historical search limits; feedback limits remain unchanged. Tavily reports provider allowance exhaustion. Identical searches reuse a 15-minute cache without spending another credit; different searches are not blocked by the application. Provider/network errors are shown separately from monthly exhaustion.

Feedback needs SERVICE_RATE_SALT, FEEDBACK_TO_EMAIL, RESEND_API_KEY and AUTH_EMAIL_FROM, plus the existing SQL. Its protections remain 3 submissions/account/hour, 10/account/day, 10/IP/hour and 20 total/day, with duplicate prevention and field limits. These do not apply to job search. Device access remains 2 approved devices with an 8-hour replacement cooldown. AI requests remain 31 credits each, Free 465 monthly and Pro 25,110 monthly. Timeouts prevent stuck requests; no AI quality settings are changed.

Nothing is pushed or deployed automatically. Keep pay-as-you-go disabled in Tavily if paid overages are unwanted. Old local retry timestamps are ignored.
