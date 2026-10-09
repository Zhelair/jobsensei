# JobSensei implementation — 9 October 2026

Two milestones combine the agreed work. These changes are local; production configuration and deployment have not been performed.

## 1. Accounts, billing and Discover

- Paddle checkout is created by the authenticated server using its configured price and an opaque checkout binding. Email is no longer the identity for new Paddle purchases.
- Subscription access is granted by completed paid transactions. SQL deduplicates events and paid periods, locks account updates, and preserves cancellation access through the paid period. Ordinary subscription updates do not refill credits.
- Legacy provider Pro accounts with missing plan expiry fall back to the existing credit-period end. An expired paid plan becomes Free before credit consumption. Future legacy expiry repair preserves the current balance.
- Sensitive account/device/billing writes are restricted to server roles; audit events store a small allow-list of metadata.
- Google sign-in uses the existing Supabase identity and device flow, with PKCE and a single callback exchange. The two-device restriction remains. Workspace data stays in the browser.
- Account includes subscription management and a compact cancel-to-Free confirmation. Deletion requires recent authentication and typed email, offers the existing export function, and confirms provider cancellation before deleting identity. A failed cancellation freezes access and retains billing bindings for retry. The existing local Clear data function remains separate.
- Legacy recurring Buy Me a Coffee access must be canceled at that provider before deletion; one-time shop access does not block deletion. BMAC remains the legacy integration, not the new Paddle transaction flow.
- Discover splits long role lists into bounded searches, recognizes relevant role aliases, filters expired results, distinguishes search/source dates from confirmed posting dates, validates supported Lever/Greenhouse results using fixed official API hosts, and caches equivalent searches for 15 minutes.
- Dedicated server search limits are 20 per hour and 100 per day per account. Empty results explain that strict recency may exclude undated listings. LinkedIn coverage still depends on public search indexing and cannot guarantee every vacancy.

## 2. Start presentation and product tour

- Product benefits and local-storage disclosure precede access/pricing.
- Seven chapters show resume context, job capture/tracking/Discover, company research, gap analysis/resume tools, Learning, spoken interview practice, and offer analysis.
- The preview uses actual JobSensei screenshots with fictional sample data. Play/Pause cycles screenshots; this is not a recorded voice/video demonstration. Mobile uses inline screenshots; desktop uses a scrolling sticky preview.
- Existing themes, sidebar, workspace structure and intentional repeated context are preserved. New presentation/account copy covers English, Bulgarian, German, Russian, Spanish, French, Italian, Polish and Portuguese. Existing translation gaps elsewhere remain.

## Production setup order

1. Review a database backup and run `supabase/diagnose-plan-expiry-readonly.sql`. Confirm which existing Pro grants are one-time purchases, recurring subscriptions or intentional manual grants. Do not mass overwrite balances based only on the screenshot.
2. For a fresh database apply `secure-auth-bridge.sql`, then `secure-hosted-credits.sql`, then `account-billing-hardening.sql`. For the existing database apply the incremental `account-billing-hardening.sql` after confirming the first two migrations are already installed. The migration itself does not mass reset legacy balances. Verify deployed roles and RLS using real authenticated clients as well as SQL.
3. Configure Paddle sandbox credentials: server `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET_KEY`, `PADDLE_ENV=sandbox`, `PADDLE_PRO_PRICE_ID`; client `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENV=sandbox`, `VITE_PADDLE_PRO_PRICE_ID`. Both prices must identify the same recurring Pro price in the same environment. Secrets must remain server-only.
4. Configure the Paddle webhook at `/api/paddle-webhook` for `transaction.completed` and the supported subscription lifecycle events. Verify success, duplicate delivery, renewal, failed payment, scheduled cancellation, final cancellation and refund policy in the sandbox. Existing Paddle subscriptions, if any, need a reviewed internal-account mapping; they are not claimed by email.
5. Enable Google in Supabase Auth and configure the Google OAuth client with Supabase's callback URL. Add the app's exact production and local redirect URLs to Supabase's redirect allow-list. Use only identity scopes. Test Google and email sign-in for the same verified identity, callback refresh, sign-out and approval/rejection of a third device.
6. Deploy the API/frontend together with the migration installed. Run provider and authenticated end-to-end checks before enabling live checkout. Paddle seller approval and the owner's local registration/tax position remain separate prerequisites; the code does not establish seller eligibility.

## Verification performed

- Vitest: 95 tests passed, covering expiry, credits, authenticated billing ownership, webhook processing, deletion failure/retry boundaries, Discover and existing functionality.
- Production frontend build passed.
- Isolated PostgreSQL-compatible PGlite verification applied all three SQL migrations and checked billing renewal/replay protection, cancellation, deletion tombstones, permissions, checkout reservation and search budgets. Run `node scripts/verify-billing-sql.mjs <absolute-path-to-pglite-module>`; PGlite is an optional external verification dependency, not a shipped app dependency.
- Browser review covered the new desktop start page and tour in existing themes, and language switching. The current in-app browser did not honor the requested mobile viewport, so physical mobile rendering still needs verification.
- Real Paddle/Google callbacks, production database privileges and signed-in lifecycle dialogs require configured external services. No live purchase, cancellation, account deletion, database change or deployment was performed.

## Remaining presentation work

Record a real short job-to-preparation workflow and a separate spoken-interview clip if desired. The screenshot tour is already functional; recorded media should show fictional data and include captions and accessible playback controls.
