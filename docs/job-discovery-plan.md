# Job discovery proposal — no source connector implemented yet

## Applications UI

Recommended primary tabs: Kanban / Workspace / Offers / Find jobs. Preserve existing Stats behind a small secondary action rather than deleting its implementation.

Find jobs layout:
- Compact editable search summary: keywords, location and current/adjacent/skills-based direction.
- Main Find jobs action; expandable filters for seniority, workplace, minimum salary, excluded terms and sources.
- Posting-date choices: last 24 hours, week, month, any time. Never substitute search-page or discovery timestamps for vacancy posting dates. Explicit option to include undated listings.
- Top 10 available matches as readable cards: title, company, location, source, verified posting date if known, up to three concrete match reasons and known gaps. Results can be fewer than ten.
- Open original / Save to applications / Dismiss; no automatic applications.
- Small New since your last check badge.
- Missing your job board? Request a source opens Account feedback with the source category, URL and country prefilled. The Account form already supports this category; cross-page routing can use `js_feedback_source` in sessionStorage and navigate to Account.

Prefill existing role, skills and experience from the active profile/resume where available; user confirms preferences. Never infer salary expectations, work authorization or willingness to change careers from a CV. Keep an ordinary editable keywords field. Adjacent or skills-based exploration is opt-in.

## Sources and free budget

- Employer connectors: documented public Greenhouse/Lever boards and published feeds. These supply employer vacancies, not LinkedIn search results. No paid job-data service is required for those public interfaces; hosting quotas remain relevant.
- LinkedIn experiment: Tavily basic queries restricted to indexed public LinkedIn vacancy pages. Incomplete coverage, stale listings and unknown dates remain possible. No user LinkedIn session is used. An ordinary sign-in or extension does not confer permission to automate LinkedIn browsing.
- Jobs.bg: normal logged-out browser access verified on 1 October 2026. Inspected the home search filters, public search results and vacancy /job/8629979: title, employer, city, publication date, salary, employment type and full description were visible. The research tool’s earlier 403 was not a blanket browser-access failure. Terms at https://www.jobs.bg/terms.php?hash=2 were read in the browser: clause 3.3 restricts using/copying/modifying/distributing third-party content for purposes outside or incompatible with the service without prior written consent; clause 3.5 forbids disrupting systems. These clauses do not establish blanket permission for a commercial automatic aggregator. No documented public API/feed was identified. Technical feasibility of reading a displayed listing is established; permitted automated integration is unresolved.
- Other boards: user requests enter the existing feedback category. Each board requires an independently assessed adapter; pasting a URL does not guarantee automatic support.

Tavily basic search costs one credit per query, not per result. Returning ten cards does not mean ten credits, nor guarantee ten relevant vacancies from a query. A three-query search consumes three credits. Its free 1,000-credit monthly allowance is shared with company research. Use recent cached results and a shared server-side budget; do not enable paid overages. Optional DeepSeek ranking is a separate AI request at the agreed 31 JobSensei credits; basic keyword filtering need not call AI.

Before implementing LinkedIn discovery, compare a small set of known searches against Tavily for relevant unique vacancies, duplicates, expired links, available dates and query cost. Do not market comprehensive coverage without evidence.

## Local state and implementation safeguards

Store source vacancy IDs/canonical URLs, first-seen time, posting date, last check, viewed/saved/applied/dismissed status locally. Match against existing applications using exact source IDs/URLs first. Company/title alone can indicate a possible duplicate but should not silently merge distinct vacancies. Mark a role closed only from reliable source evidence; absence from a partial shortlist does not prove expiry.

Keep source adapters bounded, use pagination responsibly, cache responses, and apply authenticated server-side rate/spend controls. Do not build an unrestricted backend URL-fetch endpoint: restrict permitted sources and protocols, reject internal addresses, and validate redirects. Never invent vacancies when a source fails; show saved results with their last-check date instead.
