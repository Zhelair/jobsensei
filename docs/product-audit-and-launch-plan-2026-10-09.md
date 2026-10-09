# JobSensei audit and launch plan — 9 October 2026

Latest product-copy authority: [Verified product inventory](verified-product-inventory-2026-10-09.md), based on a fresh live walkthrough of all 12 preparation-tool entry screens, Account, Learning, Discover and Offers. It supersedes the earlier five-chapter wording and the treatment of Learning as secondary. Use its seven-chapter connected story; Learning and offer comparison are main capabilities. Extend the existing Account implementation.

Planning and local verification only. Added expiry tests and a read-only database diagnostic; no application behavior, database configuration, provider accounts, or live payment settings changed.

Revised after founder feedback on 9 October 2026: Paddle selected (the message's “Pebble” is understood as Paddle). Existing in-app structure, repeated context, panels, sidebar, typography, themes and controls are intentional and must remain. The previous workspace and broader app redesign proposals are withdrawn. Design work is limited to the first-visit/start-page presentation and the specifically requested account/deletion functionality. Google adds a sign-in method to the existing account/device model. No coding or deployment is authorized by this planning discussion.

## Scope and evidence

Reviewed the four supplied screenshots, the live desktop Today, Applications, application Workspace, Interview Prep, Learning, Account and Settings screens, and relevant local auth, billing, discovery and SQL code. The browser already contained an audit account and saved example applications. First-visit conclusions therefore use the supplied screenshots plus WelcomePage source, rather than claiming a clean first-visit browser test. Mobile, all themes, every tool output, live database privileges and live billing configuration remain unverified. Existing planning documents are historical context; current code takes precedence when describing implemented behavior.

Ran six existing test files: discovery handler, discovery helpers, auth callbacks, secure device checks, secure proxy access and BMAC webhook. All 20 tests passed. This establishes a limited regression baseline, not production readiness or payment lifecycle coverage.

User constraint: only Buy Me a Coffee is currently set up. Founder is solo and has no registered business. Provider onboarding eligibility and local obligations must be resolved before live subscriptions.

## Recommended product direction

Preserve the app exactly in its current design direction. Keep repeated application titles, status indicators and tool entry points as intentional context. Retain the existing sidebar on the start page. Present the product more clearly to first-time visitors through a scrolling product story using existing JobSensei components and theme tokens.

Recommended order: inspect effective database permissions and diagnose existing account expiry/balances; define billing/credit/deletion rules; harden these foundations; configure Paddle sandbox and Google sign-in; improve the first-visit page; repair Discover; complete billing acceptance before live payments. No workspace redesign or broader UI rollout.

## Findings requiring attention before paid launch

1. **Potential direct entitlement/device modification.** `supabase/secure-auth-bridge.sql` creates UPDATE-own-row policies for accounts and device registrations. Accounts contain plan and credit fields; devices contain approval fields. RLS ownership does not protect server-managed columns. If the authenticated database role retains UPDATE privileges, these policies can permit unauthorized edits. Verify actual deployed grants and policies; revoke client updates on these tables or restrict explicitly safe columns, with sensitive writes through trusted server routes. Test using ordinary authenticated credentials, not the service role. Do not call this a confirmed deployed exploit without that check.
2. **Repeated billing events can refill credits.** `upsertPlanGrantFromPaymentProvider` passes `resetCredits: true` for active events, including updates and webhook retries. Subscription-level upsert is not event-level idempotency. Introduce unique provider/environment/event IDs, durable processing and a unique renewal-period credit grant. Duplicate or metadata-only updates must not refill usage. Use provider state/version checks to prevent older events undoing newer cancellation or payment state.
3. **Purchase ownership is email-based.** The Paddle checkout includes a client-supplied user ID, but provisioning currently locates the account by email; custom-data email takes precedence over fetched customer email. Create checkout from an authenticated server request, record account/customer/subscription mappings, use allowlisted prices, and derive ownership from the trusted mapping. Keep email claiming only as a carefully verified migration path for existing BMAC purchases.
4. **Audit logging is a stub.** `logSecureAuditEvent` currently discards its inputs. Add minimal durable events for grants, device actions and account deletion; exclude tokens, keys, resume text and full AI conversations. Define retention for billing payloads currently stored in metadata.
5. **Discover has no shared application budget or server cache.** Current tests deliberately assert that the old limiter is not called. The 15-minute cache is in browser state and does not constrain requests across browsers/accounts. Do not silently restore previously removed product quotas: agree a generous fair-use policy and shared provider spend cap, then enforce it server-side with transparent messages.
6. **Billing portal requires an active grant.** `paddle-portal.js` finds only active grants. Past-due/canceled customers still need payment recovery and invoices. Use a persistent owned billing-customer mapping independent of entitlement status.
7. **Deletion and billing are disconnected.** The deletion handler releases grants for future email reclaim and deletes the auth user; it does not cancel a provider subscription. Specify cancellation, retained financial records, local workspace deletion and re-registration behavior before launch. A deleted account must not silently keep paying or regain access contrary to policy.

Existing strengths: Supabase identity, server-verified proxy access, device checks, server-side AI credentials and credit consumption/refund RPCs with row locks. Keep and extend these rather than rebuilding identity.

## Billing choice for a solo founder

Decision: **Paddle** is the selected subscription provider. Keep BMAC customers/grants working and retain a separate support link. Stripe/Lemon Squeezy comparisons below are background research only; do not implement multiple subscription providers. Confirm individual onboarding and payout requirements before live activation.

Paddle is already scaffolded in `src/lib/billing.js`, `api/paddle-webhook.js` and `api/paddle-portal.js`, but is not confirmed live. It acts as merchant of record. Its account-verification documentation explicitly exempts individuals/sole traders from business verification; identity and domain review still apply. This is evidence of an individual onboarding route, not a promise of approval for this account.

Lemon Squeezy also acts as merchant of record, offers API/webhooks/test mode and a customer portal, and lists Bulgaria for bank payouts. Store and identity approval are required. Confirm individual onboarding before choosing it; country support alone does not prove seller approval.

Stripe provides hosted Checkout, subscriptions, a hosted billing portal, sandbox cards, CLI webhook forwarding and test clocks. Ordinary Stripe processing does not itself make Stripe the reseller of JobSensei. Confirm Bulgarian individual account eligibility and the founder's local status before committing. Do not assume Stripe requires a limited company everywhere, or that a merchant of record removes personal tax or registration duties.

For a EUR 5 monthly plan, compare net proceeds after fixed transaction fee, percentage fees, applicable extras, tax treatment, payout/FX fees, refunds and AI/search costs. Paddle advertises 5% + 50 cents and offers contact for products below USD 10; Lemon Squeezy advertises the same base fee with possible additional fees. Do not convert the fixed fee to euros without checking settlement terms. Recheck the economics before committing to EUR 5 or annual discounts. A Bulgarian accountant can resolve the individual's registration/income obligations based on the actual arrangement; this plan does not establish a legal exemption.

### Standard implementation pattern

Authenticated user -> server-created checkout -> hosted payment page -> signature-verified webhook -> durable billing state -> server-managed entitlement -> Account billing portal.

- Secrets and service-role credentials stay server-side. Frontend publishable/client tokens are separate from secrets.
- Separate local/preview sandbox and production prices, keys, webhook secrets and billing records. Test events must never grant live Pro.
- Validate exact product/price/environment. Verify signatures against the unmodified request bytes with timestamp checks.
- Save events durably, process idempotently, support retries, and reconcile provider state after missed events.
- Checkout redirects show pending/confirmed status; never grant Pro from a redirect URL or frontend callback.
- Define active, trialing, payment-pending, past-due, paused and canceled access explicitly. Scheduled cancellation normally keeps access through the paid period. Decide grace, refund and dispute policies.
- Credits refill once per entitled billing period. Metadata changes and retries cannot mint credits.
- Offer invoices, payment-method update and cancellation through the provider portal, including for customers whose paid access has ended.

### Sandbox acceptance

Test actual sandbox subscriptions from end to end: successful checkout, abandoned checkout, declined card, required authentication, delayed webhook, duplicate event, out-of-order events, failed renewal, recovered payment, scheduled/immediate cancellation, trial end if offered, refund/dispute handling, portal ownership and cross-account isolation. Advance time with Stripe test clocks if Stripe is selected; use the selected provider's supported simulations for other providers. Verify credits and access in the database and UI after each case. No real cards needed for this phase.

## Google sign-in plan

Use the existing Supabase Auth user as canonical identity. Google is an additional sign-in method alongside email links; signing in does not create a paid plan or cloud-sync local workspace data.

1. Configure Google OAuth consent/branding and a web client, using real support/contact and privacy/terms links. Verify the requested domains as applicable.
2. Set Google's authorized redirect URI to the exact Supabase Auth callback shown in its dashboard. Separately allowlist JobSensei's post-auth callback in Supabase. Use stable staging/production origins and localhost; avoid broad production redirect wildcards.
3. Store Google client secret in Supabase provider configuration. Add `signInWithOAuth({ provider: 'google' })`, explicitly choose PKCE, and make one component responsible for callback exchange. Current code already handles query codes but does not explicitly configure PKCE; avoid races between SDK URL handling and manual exchange.
4. Use only identity scopes needed for sign-in. No Gmail, Drive, contacts or offline Google refresh token storage needed.
5. Preserve return destination with an allowlisted internal route. Show clear canceled/expired/error states; remove auth parameters after use.
6. Test email-link users later signing in through Google, changed email, duplicate identities, provider linking and different Google accounts. Map billing to immutable internal IDs. Rely on documented verified-identity linking rules, not arbitrary client-submitted email matches.
7. Verify sessions on every protected server route. Browser device IDs are revocable convenience/abuse controls, not hardware-bound proof. Protect stored browser sessions and BYOK keys from XSS; evaluate CSP and third-party scripts. Local storage is not encryption.

Acceptance: sign-in/reload/sign-out, callback failures, same-account linking, local workspace preservation, expired session recovery, device 3 and revoked-device behavior, plus no elevation of plan or credits through client writes.

## First-visit page and demo media

Current problem: pricing/access choices compete with the product explanation. The first screen exposes device caps, raw credits and BYOK. “Skip for now” suggests the useful path is a compromise. The oversized media placeholder displays internal production text and empty nested panels. The screenshot also shows awkward price wrapping.

Proposed page order:

1. Keep the existing sidebar/header shell and JobSensei controls. Place the new product story in the main content region without a second competing navigation bar.
2. Hero: **“Turn a job posting into a prepared application.”** Supporting text: “Save the role, compare it with your experience, and prepare your interview answers in one workspace.” Primary **Start free**, secondary **See how it works**. Explain guest/local use accurately if offered.
3. Real product proof beside/below the hero: one coherent example application, rather than a blank container.
4. Three stages: save a job; understand fit; practice for the interview. Show actual outputs.
5. Short local-storage/privacy explanation, then pricing and FAQ, then a final start action and quiet legal footer links.

BYOK belongs under advanced Settings. Device caps belong near account/device management and plan details. At the existing flat cost, 465 credits equals 15 hosted requests and 25,110 equals 810; a multi-turn interview can consume multiple requests, so do not label those as 15/810 interviews. Explain usable allowance and per-action consumption before AI runs.

Demo storyboard, 20–30 seconds total: save a synthetic job (0–6s), show evidence-based strengths/gaps (6–14s), answer one mock question and show feedback (14–24s), return to the saved application (24–30s). Use fictional companies and sanitized data. Record the existing app UI; no workspace redesign is needed first. Provide a poster plus MP4/WebM, mute optional autoplay, pause controls, captions for narration, reduced-motion/static fallback and no autoplay sound. Prefer compressed video over large GIFs. Load below-fold clips lazily and reserve aspect ratio. No fabricated accuracy, outcomes or customer testimonials.

Success measure: first-time users understand the workflow quickly and can save their first job without understanding billing jargon. Measure first-job saved and first meaningful prep completed, not only signup counts; keep analytics free of resume/JD text and identifiers.

## Design scope confirmed by founder

The previous recommendations to simplify Today, change the workspace, rename tabs, reorganize Interview Prep/Learning/Account/Settings or remove repeated context are withdrawn. Preserve those screens and their style. Do not apply this audit as a blanket redesign specification.

New first-visit content and the deletion dialog should use the existing fonts, buttons, colors, radii and theme system. Test their contrast, keyboard operation, focus, zoom and responsive behavior without changing the app's broader layout.

## Discover: causes and design

The route makes one Tavily basic request for at most 20 results, restricted to LinkedIn or Greenhouse/Lever domains. Employer boards are also searched through Tavily; there are no actual direct board connectors. It returns snippets and provider source dates, then filters titles/location. The client hides saved/dismissed/viewed results and shows up to ten matches, sorted by keyword overlap.

Consequences:

- “Any time” is the default. Neither original posting date nor open/closed status is verified.
- Tavily's current docs say date filtering may use publication or update dates; `published_date` is an estimate, and undated results remain unless strict date filtering is enabled. Even strict provider filtering does not prove vacancy freshness.
- One Boolean-style multi-role query may have poor recall; measure the provider's handling instead of assuming search-engine syntax works identically.
- Title-only alternatives match exact words/simple plurals. “Investigations” can miss “Investigator”; related names and genuine skills-only matches may be dropped. Preserve title evidence so recommendation snippets cannot create fake role matches.
- Free-text location mixes city, country and remote constraints. Any “remote” text can satisfy the current remote preference without proving the employer hires in Bulgaria.
- Search-engine LinkedIn coverage differs from LinkedIn's internal results. No query or LLM can guarantee parity.
- “New since last check” means newly discovered, not newly posted; first-search results get the same badge.

### Planned pipeline

Confirmed preferences -> bounded candidate retrieval -> normalization/deduplication -> availability/date evidence -> eligibility/relevance scoring -> explained shortlist.

1. Separate role families, optional skills, seniority, city/country and workplace preference. Treat location eligibility unknown as unknown. Add optional language requirements without inferring them from a city.
2. Use a small bounded query set (for example, up to three role-family/location queries) and a server cache/spend ceiling. Do not broaden recency or location silently.
3. Add employer-scoped official Greenhouse/Lever adapters for a curated registry of relevant employers; these APIs are not a global job index. Each adapter records its date/availability semantics. Broader boards require documented licensed access or permission; no authenticated LinkedIn scraping plan.
4. Normalize canonical ID/URL, company, title, location, workplace, language, posting date, date provenance, first-seen and last-checked, source and availability confidence.
5. Verify availability where permitted through an authoritative board/API or employer page. Inspect explicit closure and structured JobPosting evidence where available; HTTP 200 alone does not establish an open role. Avoid using ATS update time as posting time. Use safe allowlisted requests, bounded redirects/timeouts and SSRF protection.
6. Hide confirmed closed roles by default. Treat verification-blocked roles as unverified, not closed. Offer posting-date filters with a separate include-unknown-date choice; an older still-open role is not necessarily obsolete.
7. Use deterministic role synonyms and structured filters first. Optional AI reranking may explain matches but cannot establish vacancy dates, availability or unobserved qualifications.
8. Explain empty results distinctly: none retrieved, none meet filters, all already saved/hidden, provider unavailable, quota exhausted. Show counts and one useful adjustment; link to a user-run original-board search where appropriate.
9. Cards: role/company, location/eligibility, genuine posting date or Unknown, checked time, 1–3 match reasons and known gaps. Actions: Open listing, Save job, Dismiss. Hide provider-budget details behind About search.

### Validation before rollout

Use a benchmark of 20–30 dated/source-labeled reference listings with several role and location scenarios. Include Bulgarian remote eligibility, synonym titles, German-only roles, duplicate URLs, expired pages returning 200, unknown dates and recent page updates for old vacancies. Compare discovery to the reference sample (not “all LinkedIn jobs”), record precision/recall, date confidence, stale rate, latency and provider credits/search. Provisional goals: at least 8/10 relevant top results on representative searches, zero known-closed roles in the default verified group, zero invented dates, correct differentiated empty/error states, and enforced cost ceilings. Calibrate targets after baseline measurement; do not advertise them as current performance.

## Implementation batches and release gates

| Batch | Reviewable result | Gate |
| --- | --- | --- |
| 0 | Read-only permissions/expiry diagnosis; Paddle onboarding and written credit/deletion rules | Effective privileges, legacy balances and seller eligibility understood |
| 1 | RLS/column privileges, expiry enforcement, audit events and replay-safe billing state | Client cannot alter credits/plans/device approval; expired Pro cannot refill/spend |
| 2 | Paddle sandbox checkout, customer mapping, portal and deletion coordination | Retries/renewals grant once; billing remains manageable after paid access ends |
| 3 | Google alongside email links | Same account/device restrictions, no local-data loss or false sync promises |
| 4 | First-visit scrolling story and existing-app recordings | Existing shell/themes preserved; privacy copy, mobile and reduced-motion checks |
| 5 | Discover retrieval and evidence improvements | Benchmark, truthful dates/availability and useful empty/error states |
| 6 | Full launch acceptance | Payment lifecycle, deletion retries, ownership and expiry validated before live mode |

Confirmed: Paddle; Google as an additional sign-in method; local-only workspaces; existing two-device and other access restrictions; existing app UI/context repetition. Remaining choices: EUR 5 economics, monthly versus annual at launch, exact no-rollover/legacy-credit policy, deletion/refund wording and optional clearing of this browser, Discover fair-use policy. Recommendations are for discussion, not approval to deploy.

## Follow-up: 31-day Pro/credit diagnosis

Screenshot shows Pro balances of 52,473, 52,969 and 88,888, above the current 25,110 allowance. It does not show `plan_expires_at`, credit-period boundaries or grant source. Creation/linked timestamps alone do not determine paid access expiry, and a remaining balance alone does not prove spendable access.

Code findings:
- `isAccountProExpired` returns false when Pro has no parseable expiry. A null expiry therefore does not expire after 31 days automatically.
- `ensureSecureAccountAccess` downgrades explicitly expired Pro during a request, not on a scheduled database sweep. Dormant database rows can remain labeled Pro until checked.
- Credit routines advance overdue windows and refill using the stored tier. Credit consumption RPC needs its own authoritative entitlement enforcement; do not rely only on a prior JavaScript check.
- Current normalization/refund migration intentionally preserves some legacy higher balances. Do not silently clamp all balances from a screenshot.
- Fixed 31-day credit windows are not calendar-month subscription periods. Paddle Pro must follow actual paid billing-period boundaries.

Read-only diagnosis should inspect effective policies/grants and, per account, tier, source, expiry, credit boundaries, grant history and ledger events. No credential or email values are needed in the report. Classify finite BMAC access, Paddle subscription, dated admin/test grant and any explicitly approved indefinite grant separately. Undefined expiry must not accidentally mean perpetual Pro.

Proposed rules (pending founder agreement): Free refills on its documented schedule; Paddle Pro refills once for a verified paid period; unused monthly Pro allowance does not roll over; finite BMAC/admin access ends at its explicit expiry; expired Pro loses its Pro balance and gets the ordinary Free allowance. Keep genuine separately purchased/promotional credits distinct if those products exist. Any existing-balance migration needs a preview of affected records and an explicit treatment of earlier promises.

The four existing expiry tests pass; they do not validate deployed RLS, null-expiry policy, SQL expiry races, provider renewal replay or every legacy balance case. Add meaningful tests at just before/at/after expiry, null/invalid expiry, month-length changes, concurrent requests, failed renewals and delayed refunds.

## Follow-up: account deletion proposal

Keep ordinary subscription cancellation separate from account deletion: cancellation preserves the account and paid access until the paid period ends; deletion ends hosted access and forfeits its remaining included credits immediately when completed.

Proposed dialog, using current JobSensei styling:

> Delete your JobSensei account?
>
> This permanently removes your sign-in account and approved devices. Your remaining hosted AI credits will be lost. Your Paddle subscription will be canceled so it does not renew. Deleting your account does not automatically request a refund.
>
> Resumes, applications and notes saved in your browsers are separate. Export a backup before clearing them. We cannot erase local data from another device. Some billing records are retained where required.

Actions: Keep account and Delete account. Reuse the existing `exportAll` function as an optional Export All Projects link above these actions. Require recent authentication (Google users can reauthenticate with Google) and typed email. Keep local clearing in the existing Settings > Data Management > Clear All Data flow; do not add a new clearing mechanism or checkbox to deletion. Explain this separation and link to Settings when useful. Show the actual remaining balance and actual billing state rather than generic claims. Provide an ordinary cancel-subscription route for users who only want to stop payment.

Backend: create an idempotent deletion request, freeze hosted spending/checkout, confirm immediate Paddle subscription cancellation (including all owned active subscriptions), retire entitlement grants so re-registering cannot reclaim them, revoke devices/sessions, then erase account personal data. If provider cancellation fails, retain a resumable pending-deletion job, clearly report pending status, retry and alert support; do not report success or delete the identifiers needed to stop charges. Handle an in-flight renewal and late webhooks without resurrecting the account. Retain only required minimal billing/deletion evidence under a defined policy. BMAC legacy subscriptions, if any, need their own cancellation path and truthful provider-specific copy. Re-registration/Free allowance policy also needs abuse-aware server rules.

## Follow-up: Cloudflare and targeted bot protection

Decision: skip Cloudflare, including Turnstile, for the current scope. Retain Vercel delivery and its automatic DDoS mitigation. The following provider research is background only, not planned implementation.

Cloudflare Turnstile is free for the normal plan and can run independently of Cloudflare DNS/proxy services. Consider it for email-link requests/signup and feedback where bot abuse matters. Use Supabase's documented CAPTCHA integration where appropriate; for custom endpoints verify tokens server-side with hostname/action validation. Tokens are short-lived and single-use. Rate limiting, authoritative account access and provider spend controls remain necessary. Do not challenge every page visit or put interactive challenges on Paddle webhooks or OAuth callbacks.

References: [Vercel DDoS](https://vercel.com/docs/vercel-firewall/ddos-mitigation), [Vercel proxy guidance](https://vercel.com/kb/guide/cloudflare-with-vercel), [Turnstile free plan](https://developers.cloudflare.com/turnstile/plans/), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Follow-up: Griffin-inspired start-page presentation

Reviewed Griffin's live page and supplied screenshots. Borrow its progressive explanation, chapter markers and coordinated product visual, not its banking language, serif type, black palette or navigation.

Inside JobSensei's existing main panel: benefit-led hero; the five product chapters detailed below; local-storage/AI-processing explanation; Free/Pro pricing lower down; FAQ and final CTA. Desktop can use a sticky preview beside ordinary scrollable chapters, with small active markers. Chapters should also be clickable; no scroll trapping or forced long animation. Mobile and reduced-motion use stacked static previews. Preserve the current sidebar, fonts, buttons and every theme. Use actual JobSensei screens and brief recordings with synthetic data.

Suggested near-CTA disclosure: “Your resume, applications and notes are saved in this browser. Signing in restores account access and credits, but does not sync your workspace.” Supporting text: “When you use AI, the text needed for that task is sent to the selected provider.” Offer backup/export guidance in the privacy section. Local-only does not mean nothing ever leaves the device.

## Latest verification and product-aligned presentation

The latest screenshot shows populated `credit_period_ends_at` but NULL `plan_expires_at` in all four visible rows. Credit reset and access expiry are separate fields in current code. Added five local cases to `authBridge.plan-expiry.test.js`: explicit expiry just before/at/after the boundary; null and invalid plan expiry with an overdue credit period. The boundary cases retain Pro before expiry and downgrade to Free at/after expiry. The two characterization cases reproduce retaining Pro and 88,888 credits. Those expectations document the defect and must change with the eventual policy/fix. All 15 tests across expiry, secure proxy and credit display passed. These mocked database tests do not establish deployed SQL behavior. `supabase/diagnose-plan-expiry-readonly.sql` provides read-only inspection of dates, effective privileges, policies and installed routines; it has not been run against production.

Existing function inventory: Settings already has `exportAll`, `exportProject`, import and `clearAllData`. The clearing function removes listed JobSensei local keys and reloads the page; do not replace it with a generic `localStorage.clear()` or duplicate it in deletion. Hosted deletion API/client helper already exist; the search found no component invoking `deleteSecureAccount`, so the account deletion UI needs wiring rather than a second backend. Account export and workspace backup are different functions/data scopes.

Billing UI proposal, in the existing Account plan card:
- Free: existing Upgrade to Pro action.
- Active paid Pro: one Manage billing button and a quieter “Cancel Pro — switch to Free” action. Link cancellation directly to Paddle's owned subscription portal flow; do not add another questionnaire or duplicate confirmation form in JobSensei.
- Before cancellation, explain “Keep Pro until [actual date], then switch to Free. No further renewal.” After provider confirmation show “Pro until [date] · Switches to Free automatically,” replacing the cancellation action with a pending-state label. Allow reversal only while the provider's scheduled cancellation remains reversible; a fully canceled subscription requires a new subscription.
- Paused/past-due plans have different provider behavior; compute truthful status/cancellation text rather than promising the paid-period path for every state.
- Keep account deletion separate from billing actions, in the existing account area with current button styles. No new local-data-removal controls.

Paddle reference: [scheduled cancellation and portal deep links](https://developer.paddle.com/build/subscriptions/cancel-subscriptions/). Handle provider errors near renewal and do not claim cancellation on portal navigation alone.

Proposed hero: **“Your resume, applications and interview prep—in one workspace.”** Supporting text: “Upload your resume, capture jobs, prepare company notes, check your fit and practice interviews by voice or text.” Start free + See how it works using existing JobSensei buttons.

| Chapter | Actual features to demonstrate | Draft copy |
| --- | --- | --- |
| 1. Start with your resume and a job | TXT/PDF resume upload, pasted/captured JD, application creation | Upload your resume once per project. Save a job and keep its description with your application. |
| 2. Prepare company notes | AI company notes, tools/systems, culture signals, prep notes and questions to ask | Use AI to draft company notes and questions to ask, then review and refine them in the job workspace. |
| 3. Understand your fit | Gap Analysis, strengths/gaps, Resume Checker, STAR Builder and Cover Letter Optimizer | Compare your experience with the role, review your resume and shape stronger application material. |
| 4. Practice a live mock interview | Interactive interview session, microphone answers, spoken AI replies, text fallback, Sensei/Drill, debrief and saved sessions | Talk with your AI interviewer or type your answers. Practice for the role and review your feedback afterwards. |
| 5. Follow each application | Existing application stages, progress, saved research/notes/preparation, follow-up drafting | Track each application and return to its notes, stories and practice history as you move forward. |

Verified limitations: current `runResearch` sets `searchContext = null` and labels results AI-only, so company copy must not promise live verified facts/latest news. Voice uses browser recognition/synthesis and depends on device/browser/language; it is an interactive AI mock interview, not a human interview or guaranteed seamless full-duplex call. Resume upload currently supports TXT/PDF; do not advertise DOCX import. Fit feedback is guidance, not an employer hiring prediction or guaranteed ATS outcome.

Nine configured languages: English, German, Bulgarian, Russian, Spanish (Spain), French, Italian, Polish and Portuguese (Brazil). Show “Available in 9 languages” near the voice demo, with names accessible in a compact line/expansion. Separate interface/AI language configuration from device-dependent speech availability; browser voices are not guaranteed for every language. Configuration is verified, not full translation-quality certification.

Superseded by the verified inventory: Learning and Offers are central features, with gap-to-study demonstrated in the main story. Discover is also part of the main feature inventory, with honest public-index/freshness limits. Group supporting tools within their relevant chapters rather than omitting them or putting every tool into the hero.

## Primary references checked

- [Paddle individual/account verification](https://www.paddle.com/help/start/account-verification/what-is-account-verification)
- [Paddle pricing](https://www.paddle.com/pricing)
- [Paddle sandbox](https://developer.paddle.com/sdks/sandbox/)
- [Paddle lifecycle provisioning](https://developer.paddle.com/build/subscriptions/provision-access-webhooks/)
- [Lemon Squeezy activation](https://docs.lemonsqueezy.com/help/getting-started/activate-your-store)
- [Lemon Squeezy supported payout countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries)
- [Lemon Squeezy pricing](https://www.lemonsqueezy.com/pricing)
- [Lemon Squeezy test mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
- [Lemon Squeezy API](https://docs.lemonsqueezy.com/api)
- [Stripe billing testing](https://docs.stripe.com/billing/testing)
- [Stripe customer portal](https://docs.stripe.com/customer-management)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
- [Stripe Bulgaria pricing](https://stripe.com/en-bg/pricing)
- [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Tavily search parameters and date semantics](https://docs.tavily.com/documentation/api-reference/endpoint/search)
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)
- [Lever Postings API](https://github.com/lever/postings-api)
- [JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
