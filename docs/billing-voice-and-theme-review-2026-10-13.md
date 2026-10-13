# JobSensei review — 13 October 2026

Changes are local and have not been deployed. No live purchase, refund, DNS change or production database migration was performed.

## Findings and implementation

All three production legal URLs returned HTTP 200. The live refund page contained three Buy Me a Coffee references and no Paddle reference; privacy contained nine and no Paddle reference. Terms contained no billing-provider explanation. Local policies now describe Paddle for new subscriptions and BMAC only for legacy purchases/support. The refund policy separates mandatory rights from discretionary refunds and distinguishes cancellation from withdrawal. Terms now explain recurring billing, allowances, cancellation, abuse and mandatory remedies. Privacy adds Paddle billing identifiers, hosted DeepSeek processing, browser speech, processing purposes and privacy rights. The provider list was updated in every available locale. New operational sections are explicitly English in other locales; full legal translations remain to be reviewed.

Legal publication still requires the actual operator/controller identity, appropriate address, a verified public support/privacy contact, a specific retention schedule and review of provider agreements and international-transfer safeguards. The domain name is branding, not a substitute for the legal operator. The new wording is a reviewable draft, not a finding that the service is fully compliant.

### Refunds and lawful abuse controls

EU online service contracts generally have a 14-day withdrawal period. Digital content and ongoing services have different exceptions: using a subscription does not automatically extinguish withdrawal. For services started during that period, a lawful proportionate charge requires the relevant information and an express request to start; the fully performed exception has additional consent/acknowledgment requirements. Do not install a blanket “first AI request waives every refund” checkbox. Confirm JobSensei's classification and checkout treatment with Paddle and a Bulgarian/EU consumer adviser before relying on an exception.

Outside mandatory rights, discretionary claims can be declined case by case, including documented abuse or substantial consumption. Defective/misdescribed-service remedies remain separate. Use the Free allowance to demonstrate quality; retain clear recurring price/allowance disclosures, usage limits, account/device protection and payment/usage evidence. Any further rate limiting must be proportionate and disclosed. Do not retroactively cut a paid allowance or make withdrawal conditional on giving a reason.

Paddle offers eligible EU withdrawal in its portal, receipt links and paddle.net. Keep cancellation and refund instructions distinct. Full refunds should remove the matching paid entitlement without restoring large Free allowances on repeated webhook delivery.

Local webhook now handles `adjustment.created` and `adjustment.updated`, re-fetching authoritative adjustment, transaction and subscription records. Only approved refunds/chargebacks for the configured Pro price and matching customer reach the database. Full refunds remove the current corresponding entitlement. Older-period refunds preserve a later renewal; pending/rejected requests do not remove access. Partial refunds retain access for operator review. Refunded transaction records prevent late paid-event replay, including refunds arriving before the first payment callback. Processing does not automatically cancel the provider subscription.

Apply `supabase/paddle-refund-hardening.sql` **after** `account-billing-hardening.sql`, before deploying the new webhook. Add both adjustment event types to the Paddle notification destination. A real sandbox checkout → full refund → approved adjustment → Free account flow still needs verification. Cumulative partial refunds, chargeback warnings/reversals, overlapping subscriptions and manual restoration require reviewed operational handling; these are not declared fully automated.

### Paddle live status and next steps

Read-only live dashboard inspection at `vendors.paddle.com/onboarding/get-started` showed JobSensei in **Live** with:

- Set up your live account: Not started.
- Verify your account: Not started.
- Test and go live: Not started.

Paddle's verification panel requires personal/business identity details, website/product details, publicly accessible Terms/Privacy/Refund pages, on-site prices matching the catalog, and a contact email or form reachable from Home. No verification form was submitted.

Sandbox and live have separate API keys, client tokens, products/prices and webhook destinations. Complete identity/domain approval, recreate the €8 monthly Pro catalog in live with the intended tax mode, set the approved default payment link, create a live webhook, and install matching server/client environment values. Do not only flip `PADDLE_ENV`. Existing production Supabase migration state has not been established in this review. `.env.local` does not contain the local Paddle/Supabase/AI setup needed to verify hosted flows with Vite; Vite frontend rendering does not verify Vercel API execution.

Before accepting payments, test success, duplicate/out-of-order callback, renewal, decline/past-due, cancel-at-period-end, refund approval/rejection, account refresh, billing portal, account deletion/cancellation failure and replay. The owner must complete identity details and legally binding onboarding steps.

Useful Paddle features, in order:

1. Customer Portal: receipts, payment-method updates, cancellation and eligible withdrawal.
2. Retain payment recovery: recover failed payments; measure recovered revenue before tuning.
3. Cancellation surveys: distinguish “got a job” (a successful outcome) from technical issues or price. Keep cancellation easy.
4. Metrics: MRR, paid conversion, churn, refund reasons and cohort retention. Compare these with actual token costs.
5. Discounts/annual pricing after evidence of retention. Job seekers may need the app briefly, so avoid prematurely emphasizing a year-long subscription.
6. Local currencies/payment methods and checkout localization where appropriate. Verify tax-inclusive totals and the site's price claims.

### Domain email

DNS lookup found `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, and no apex MX answer. A receiving mailbox/forwarding service is not established by this evidence. Existing outbound app-mail configuration does not prove `support@jobsensei.app` can receive email.

Recommended addresses: `support@jobsensei.app` and `privacy@jobsensei.app`, forwarding to one private inbox. ImprovMX supports domain forwarding while keeping Vercel DNS; SMTP sending or a mailbox is needed to reply as the domain address. Configure only the verified mail provider's MX/SPF/DKIM/DMARC records, preserving website records and existing transactional-mail configuration. Confirm receiving and sending before publishing these addresses. Cloudflare forwarding is another option, but moving DNS solely for it adds migration work.

## Economics

DeepSeek currently recommends `deepseek-flash`; the old `deepseek-v4-flash` name routes to V4.1 Flash. Hosted proxy now uses the current name, non-thinking mode, 4,096 maximum output tokens and a 120,000-byte input-context limit. The cap is an engineering bound, not a guarantee of a profitable maximum cost. BYOK allowances/provider bills are separate. Large input context and external research still matter.

Official per-million-token Flash prices checked on 13 October: peak uncached input $0.30, cached input $0.006, output $1.20; off-peak $0.15/$0.003/$0.60. Historical personal spend does not predict 810 long user requests and may reflect older prices, cache hits or lower usage.

Illustrative assumptions: €8 **before VAT**, buyer VAT 20%, checkout €9.60, Paddle fee 5% of buyer total + $0.50, and hypothetical €1=$1.10 conversion. This gives about €7.07 after payment fees and VAT, before AI and all other costs. Confirm actual Paddle agreement, fee basis and payout FX from a settlement statement; this is not a current exchange-rate quote. If €8 includes 20% VAT instead, pre-VAT revenue is €6.67 and after the same illustrative fees about €5.81.

All 810 requests used, all uncached input, peak rates:

| Average request | Input/output tokens | AI cost USD | AI cost EUR | Contribution EUR | Contribution / €8 |
|---|---:|---:|---:|---:|---:|
| Light | 2,000 / 500 | $0.97 | €0.88 | €6.18 | 77% |
| Typical scenario | 6,000 / 1,000 | $2.43 | €2.21 | €4.86 | 61% |
| Heavy | 20,000 / 2,000 | $6.80 | €6.19 | €0.88 | 11% |
| Very long | 40,000 / 4,000 | $13.61 | €12.37 | −€5.31 | −66% |

These are scenario contributions, **not actual gross margin or net profit**. Hosting, database, email, Tavily research, refunds, acquisition, support, cloud voice and business taxes are not deducted. Off-peak/cache usage can improve them. Lower utilization also improves average costs, while large contexts can exceed the heavy example even under the byte cap.

810 is generous (about 27 requests/day), but requests are not complete interviews. Keep the current allowance intact for existing commitments. Before advertising it at scale, collect privacy-minimal input/cache/output token totals per hosted action and paid period, plus research costs; calculate median and p95 full-period contribution. Existing flat credit debits do not supply those token totals. If the high-use tail is unprofitable, reduce context through task-specific selection/conversation summaries, use variable credits for expensive actions, or choose a lower disclosed allowance for new plans. Proposed product-level budget controls must be reflected in checkout and pricing before purchase. No allowance reduction was made in this review.

## Workspace, voice and appearance

- Removed the board-only button and its unused handler. Create now saves the application and opens its workspace.
- Daylight is the default when there is no valid saved theme; saved Dark/Neon preferences remain.
- Neon uses an almost-black violet canvas, deep violet cards, magenta actions with dark readable labels, lavender text, teal completed steps and limited glow. Fixed the later root variables that previously overrode Neon. Hero uses the existing office art with a CSS violet treatment; it is not the exact generated laptop photograph in the reference collage.
- Bulgarian playback selects only a Bulgarian voice and rejects prior Russian selection. Kalina/Borislav cloud voices exist, but browser exposure is device-dependent. On the tested browser, no BG voice was exposed and preview correctly disabled. Consistent BG speech requires adding a server-side speech provider with separate credentials, costs and privacy disclosures; no cloud audio service was connected.
- Recognition continues to request `bg-BG`. Live interim text is visible and included when Done is pressed; errors stop repeated failed restarts, stale recognition callbacks are ignored, and unmount cancels speech/recognition. Actual microphone quality, accents, physical-phone resume and permission behavior still need device testing. Browser viewport tests do not establish these.

## Verification

- 119 Vitest tests passed, including new voice-matching, proxy context/output bounds and adjustment tests.
- Production build passed (existing bundle-size/pdf.js warnings remain).
- Isolated PGlite applied the new migration twice and passed current/older/partial refunds, replay, refund-before-payment, new renewal, cancellation, deletion and permission checks. No production database was accessed.
- Browser: Daylight on a fresh origin; creation of a fictional Harbour Payments application opens its populated workspace; BG voice fallback absent; all updated English policy pages render; Neon reviewed at desktop and 390px mobile with no horizontal overflow.
- Real API/payment/audio end-to-end verification remains pending. The live Paddle dashboard status is observed directly; account approval is not inferred from working sandbox code.

## Sources

- [EU withdrawal guidance](https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm)
- [Paddle refund policy](https://www.paddle.com/legal/refund-policy)
- [Paddle buyer terms](https://www.paddle.com/legal/buyer-terms)
- [Paddle sandbox and live differences](https://developer.paddle.com/sdks/sandbox/)
- [Paddle adjustment events](https://developer.paddle.com/webhooks/adjustments/adjustment-updated/)
- [Paddle transaction adjustments](https://developer.paddle.com/build/transactions/create-transaction-adjustments/)
- [Paddle pricing](https://www.paddle.com/pricing)
- [Paddle Retain](https://www.paddle.com/retain)
- [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [DeepSeek thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/)
- [Microsoft Bulgarian voices and recognition](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
- [Vercel domain/email setup](https://vercel.com/docs/domains/working-with-domains)
- [ImprovMX forwarding versus SMTP](https://www.improvmx.com/guides/forwarding-vs-smtp/)
