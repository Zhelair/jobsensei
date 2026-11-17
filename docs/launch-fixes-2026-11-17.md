# Launch fixes — 17 November 2026

## Implemented locally

- Preserve zero open-answer grades when calculating quiz averages. Quiz history storage and historical results are unchanged.
- Offer factors start unrated; incomplete ratings have no score or leader. Missing salary/ratings produce a deterministic request for details without spending an AI request. Completed comparisons use normalized weights and bounded advice based on user inputs.
- Candidate-facing prompts prohibit invented achievements, metrics, qualifications and interview events. Resume/cover-letter keyword lists are reconciled against literal CV/JD text, deduplicated and limited to JD terms. LinkedIn found terms require profile evidence. Semantic equivalence remains uncertain rather than being presented as literal proof.
- Resume Checker provides quoted requirement coverage, text readability, wording opportunities and experience not demonstrated. Unverifiable quotes are not marked supported; numerical rewrite claims absent from the CV are withheld. These checks reduce specific failure modes; they cannot guarantee factual accuracy of all generated prose.
- Keep company research and notes; remove Discover, job-source request UI, its API/library and unused Tavily research route. Current date is supplied to AI research without pretending it enables live/current facts. No stored workspace or database records are removed.
- English-only static legal pages, shared canonical copy in scripts/build-legal-pages.mjs, unchanged public policy URLs and redirect for the retired public privacy draft. Main document responsibilities: service rules, actual data flows, refund process, offer/allowance. Storage Notice remains a short technical companion.
- New starter library includes only the six selected fraud/payments/AML subjects. New projects receive those six; existing saved topics are untouched.
- Extend Story Bank with CV/JD topic discovery anchored in literal CV quotes, original notes and AI draft retained separately, explicit fact confirmation and handoff to story-focused interview practice. Saved sessions carry the story ID/title; no duplicate story or learning subsystem.
- Elevator pitch receives the full supplied CV instead of its first 300 characters.

## Payment activation remains pending Paddle

Paddle approval is external and unresolved. No provider account, catalog, production environment or database entitlement has been changed here. No messages were sent.

New checkout defaults off. Existing subscription status/cancellation and webhook processing remain available independently of the new-checkout gate.

For preview/local sandbox: PADDLE_CHECKOUT_ENABLED=true, PADDLE_ENV=sandbox, matching VITE_PADDLE_ENV/token and server price. Production rejects sandbox. For approved live activation: PADDLE_CHECKOUT_ENABLED=true, PADDLE_LIVE_APPROVED=true, PADDLE_ENV=live and matching live client/server credentials. Do not set approval true until Paddle confirms it.

Before creating a transaction, the server fetches the selected price and requires active EUR 1000 minor units, monthly frequency 1, tax_mode=external, no trial or country overrides. This matches the published EUR 10/month plus tax plan. An EUR 8 catalog item is rejected; this change does not edit Paddle's catalog. The check is based on Paddle's documented price fields: https://developer.paddle.com/api-reference/prices/get-price/.

Entitlement rules preserved: server/webhook-verified paid access follows the paid period; cancellation does not itself remove already-paid time; refund logic remains in the existing billing handlers. Free allowance is 465, Pro allowance 25,110 and each hosted request costs 31. Explicit/manual/legacy grants are not silently converted to subscriptions or expired. The provenance of old open-ended grants needs an owner decision before any migration. Do not infer paid expiry from a manual credit top-up.

The English legal copy was reconciled against the implementation and checked against Paddle Buyer Terms/Refund Policy and Your Europe withdrawal guidance. It does not invent an operator street address or unverified provider-transfer guarantees. Complete missing operator disclosure details and actual provider processing/transfer information before live sales where required; do not treat generated policy text as a compliance certification.

References: https://www.paddle.com/legal/refund-policy, https://www.paddle.com/legal/buyer-terms, https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm.

## Validation and release

Only local automated regression checks and production build are used for this implementation, per the request to stop browser testing. The local suite passed 107 tests across 23 files, including the new arithmetic, evidence, offer and checkout-policy regressions; the production build passed. No new live AI runs, purchases, DB mutations, deployment or candidate outreach. Existing saved AI output is not rewritten retroactively. Candidate workflow/payment validation and outreach planning follow the agreed product fixes and provider decision.
