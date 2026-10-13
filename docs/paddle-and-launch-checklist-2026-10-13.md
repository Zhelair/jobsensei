# JobSensei: Paddle, email and launch checklist

Status checked on 13 October 2026. App changes are local and have not been deployed. This is an operational checklist, not a statement that legal or production requirements are complete.

## Paddle catalogue created in Live

| Field | Saved value |
|---|---|
| Product | JobSensei Pro |
| Product ID | `pro_01m4txaeztd3z0qh5exn9astqx` |
| Tax category | SaaS |
| Price ID | `pri_01m4txeqyqnbb3pq1msb6bw7bx` |
| Price | EUR 10, every month |
| Tax treatment | Excludes tax; checkout adds applicable tax |
| Trial | None; the app already has a Free allowance |
| Quantity | Minimum 1, maximum 1 |
| Included hosted allowance | 25,110 credits per paid monthly period; 810 requests at 31 credits each |

The catalogue is active. This does not mean the seller is approved or the app uses this live price. Verification and go-live testing are still incomplete. Do not put a live price into sandbox configuration; the environments have separate IDs and credentials.

## How to fill seller onboarding

The live form is open at `https://vendors.paddle.com/onboarding/account-setup?step=1`.

- **Country:** Bulgaria, if that is your actual operating location.
- **Business type:** the form offers Sole Trader or Privately owned company. Use your actual legal status. Do not pick company unless you have a registered company, and do not treat the default Sole Trader selection as confirmation of Bulgarian registration. If your status does not fit, use the form's “I'm not sure” help or ask Paddle. Paddle accepting individuals/sole traders does not determine local registration or income-tax obligations.
- **Legal name:** your real name for an individual operator, or the exact registered entity name. “JobSensei” can be the product/trading name; buying a domain does not create a legal entity.
- **DOB, residential/business address and identity documents:** provide your own accurate details directly in Paddle. These are distinct from the address you legally need to disclose to customers.
- **Website:** `https://jobsensei.app`.
- **Product description:** “AI-assisted job-search preparation: application tracking, company research, resume and story preparation, learning, mock interviews and offer comparison. Free accounts can connect their own AI provider; Pro includes a monthly hosted AI allowance.”
- **Customer support:** use `support@jobsensei.app` only after inbound delivery and outbound replies have been verified. Use `privacy@jobsensei.app` for privacy requests after verifying it too.
- **Policies:** homepage must link public Terms, Privacy, Refund and Pricing pages. Publish the EUR 10 update before submitting domain review, so website and catalogue agree. Complete operator/contact details first.
- **Payout and tax fields:** enter the real account holder and tax/registration details applicable to you. The owner must complete these fields and any contractual acceptance; no payout account was configured in this work.

Paddle verification reference: https://www.paddle.com/help/start/account-verification/what-is-account-verification

## Technical go-live sequence

1. Confirm existing Supabase migrations and take a backup. Apply `supabase/paddle-refund-hardening.sql` after the prerequisite billing migrations; inspect live roles/RLS. The refund migration was tested locally in the earlier work but has not been applied remotely.
2. Use a sandbox EUR 10 monthly price and test the actual flow: email/Google sign-in, checkout, completed payment, allowance grant, duplicate webhook, renewal, failed payment, scheduled cancellation, cancellation at period end, full approved refund, refund before payment delivery, replay after refund, and partial refund requiring review. Assert both the UI and database state. This session did not run an actual sandbox refund.
3. Complete Paddle seller/domain approval and set the approved default checkout/payment-link URL.
4. Set live **server** `PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET_KEY`, `PADDLE_PRO_PRICE_ID` and live **client** `VITE_PADDLE_ENV`, `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_PRO_PRICE_ID`. Use the saved live price above for both live price variables. API and webhook secrets stay server-only.
5. Configure the live webhook at `https://jobsensei.app/api/paddle-webhook` for `transaction.completed`, the supported subscription lifecycle events, and `adjustment.created`/`adjustment.updated`. Check signatures, deliveries and replay behavior. Review handler-supported event names before selecting them.
6. Deploy frontend and API together, confirm the displayed EUR 10 and final tax total, then have the owner complete a real payment/refund smoke test. Verify customer portal cancellation and account deletion behavior. Monitor webhook failures after launch.

The current Vercel connector rejected environment inspection for this account scope. No remote environment values, DNS, database or deployment were changed. Reconnect the Vercel integration to the project's owning scope, or use an authorized Vercel dashboard session to finish configuration.

## Paddle features to use deliberately

- **Customer portal:** expose Manage billing in Account; verify receipt access, payment-method updates and cancellation. This reduces support requests without hiding cancellation.
- **Refunds/adjustments:** review in Paddle, preserve transaction-linked records, and let approved adjustments update access. Separate a refund from subscription cancellation; verify whether future renewal needs canceling for each case. Partial refunds need an explicit access decision.
- **Payment recovery/Retain:** check account availability, terms and pricing, then configure failed-payment recovery and useful reminders. Start with cancellation surveys; inspect reasons before adding discounts. Job seekers naturally stop when hired, so record “found a job” separately from dissatisfaction.
- **Metrics:** track MRR, paid conversion, churn, refund rate, recovered payments, and gross-to-net payouts. Add internal hosted token cost per active payer; request count alone is not cost.
- **Localized checkout, receipts and tax:** keep clear final prices and provider receipts; verify real checkout presentation in target markets.
- **Discounts/annual plans:** add only after observing retention and cost. A yearly commitment may fit poorly with a short job search. Keep the initial catalogue to a simple monthly plan.

Feature references: https://developer.paddle.com/concepts/sell/customer-portal/ ; https://www.paddle.com/retain ; https://www.paddle.com/profitwell-metrics

## Email forwarding and replies

Requested aliases: `support@jobsensei.app` and `privacy@jobsensei.app`, both forwarding to the owner's supplied Gmail inbox. The private inbox should not appear on public policy pages or in frontend source.

The ImprovMX signup is open. The owner must choose a password and complete account creation/terms acceptance. Once signed in:

1. Add `jobsensei.app` and both aliases, with the supplied Gmail inbox as destination. Avoid a catch-all initially to reduce spam.
2. Add the exact MX/TXT records ImprovMX shows at the authoritative DNS provider. Preserve existing website and sending-provider records. Merge SPF mechanisms into one SPF record rather than adding a second SPF record.
3. Wait for verification and test both aliases with external mail, including spam-folder checks.
4. Configure authenticated SMTP and Gmail “Send mail as” (or a domain mailbox) to reply as the aliases. Forwarding alone handles receiving; it does not establish authenticated sending. Check provider plan costs before subscribing.
5. Verify replies arrive with the domain From address and SPF/DKIM/DMARC pass. Then publish the aliases in policies and Paddle.

Reference: https://www.improvmx.com/guides/forwarding-vs-smtp/

## What Terms and Privacy still need

| Item | What to do |
|---|---|
| Operator/controller | Supply real legal name, actual legal status, and legally appropriate contact/service address. Use the same operator throughout Terms, Privacy and Paddle. Keep product name separate from legal identity. |
| Contacts | Verify support/privacy aliases and add public mail links. Route privacy/deletion requests to someone who checks the inbox and tracks response deadlines. |
| Billing | State EUR 10/month plus applicable tax, recurring renewal, included allowance, unused-credit treatment, cancellation effects and BYOK provider charges. Verify all statements against code and real checkout. |
| Consumer rights | Preserve mandatory withdrawal and defective-service remedies. Usage thresholds can guide voluntary refunds but cannot override statutory rights. Do not assume a checkbox validly waives rights for every kind of digital subscription. Have the precise immediate-performance/withdrawal wording reviewed for the service and Paddle checkout. |
| Data map/legal basis | List account/device identifiers, billing records, support mail, AI prompts/resume/job content, browser voice services and analytics. Document purpose and the appropriate Article 6 basis for each; do not claim everything is consent-based. |
| Providers/transfers | Inventory Supabase, Vercel/analytics, DeepSeek, Paddle, actual transactional email provider, ImprovMX/Gmail and BYOK providers. Confirm each role, region, DPA where applicable, subprocessors and any transfer mechanism. Paddle may be an independent controller for its payment processing; do not label every vendor a processor. |
| DeepSeek | Verify the API-specific contract, retention, training usage and processing locations. For EEA personal data, assess third-country transfers, safeguards and supplementary measures. Do not claim EU-only processing or zero retention without evidence. Consider a provider with appropriate contractual safeguards if the review cannot establish compliant use. |
| Retention | Decide actual periods, implement cleanup, and publish the periods or meaningful criteria. A sentence saying “as long as necessary” without an operational schedule is inadequate for planning. |
| Rights/deletion | Describe access, correction, erasure, restriction, objection and portability where applicable; provide a request route and competent supervisory-authority complaint information. Explain local workspace clearing separately from server account deletion and necessary legal records. |
| Locales | Translate new operational sections and review them against English. Do not imply untranslated English inserts are a complete translated legal policy. |

GDPR reference: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng (especially Articles 5, 6, 13, 28 and Chapter V). Processor/controller reference: https://www.edpb.europa.eu/sme/learn-the-basics/data-controller-or-data-processor_en

### Proposed retention schedule — not yet implemented or published

- Local resumes/applications: until the user removes them or clears browser storage; exported backups remain under their control.
- Account/device records: while the account exists; delete after successful account deletion, apart from specifically justified security/legal records.
- Routine operational logs: target 30 days; avoid prompt/resume bodies and API keys in logs.
- Billing webhook/replay identifiers: retain for a documented period sufficient for refunds, disputes and reconciliation; derive the exact period with provider requirements and accounting advice. Keep minimal tombstones only where justified, with a review/expiry rule.
- Support conversations: target 12 months after resolution; separate ongoing disputes or legally required records.
- Accounting records: the period required for the operator's actual Bulgarian legal/tax status, confirmed by an accountant; do not invent a number.
- Provider-side AI and voice retention: confirm actual vendor rules and disclose them. Local application cleanup does not delete a provider's own records.

These are proposals. Before publication, configure actual deletion jobs/log limits, run deletion checks, document exceptions and confirm provider behavior.

## App presentation changes

The homepage leads with Applications, followed by Research, Preparation, Interview practice, Resume, Learning and Offers. Each has one outcome sentence plus a real existing app screenshot with fictional data, and a full-size image link. This avoids duplicating mock-interview content as the first workspace preview.

Email access explains a secure sign-in link and no password. BYOK explicitly needs a free account, is optional relative to Pro, bills through the chosen provider, and does not use hosted credits. Google/email buttons use the same width. Long company names/URLs wrap. Profile & Resume has two steps and a narrower dialog. Bulgarian voice guidance suggests trying Edge and testing availability, without promising that Edge Read Aloud voices are exposed to the app.

## Release checks still worth doing

Confirm backup/export recovery (workspaces do not sync); test a third device and same-email Google/email identity; verify mobile layout and keyboard dialog navigation; measure token usage at p50/p95 and heavy-user limits; monitor error/refund rates; keep accessibility and reduced-motion settings usable. At EUR 10, assess margin from actual net Paddle payouts minus hosted tokens, infrastructure and support—not a lifetime personal DeepSeek bill.

## Verification in this session

- 119 tests passed; production build and `git diff --check` passed.
- Desktop browser verified EUR 10, passwordless copy, screenshot loading, Profile & Resume layout, Escape close/focus restoration, and long URL wrapping (card content width equaled scroll width).
- Local browser has no Supabase configuration, so the Google button is hidden there; its shared-width CSS was reviewed, but a configured deployed sign-in flow still needs checking.
- The browser viewport override produced a scaled desktop image rather than a confirmed mobile breakpoint. It was reset; physical/mobile rendering is still an external verification item.
- No production deployment, live transaction, remote database migration or DNS/email configuration was performed. The live catalogue creation is the only completed external configuration change.
