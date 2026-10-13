# JobSensei launch readiness audit — 13 October 2026

**Decision: keep payments in sandbox.** This audit found and fixed real issues, but does not establish readiness for live billing. Website approval, credential hygiene, backups, policy completion and actual billing-flow tests remain open.

## Changes applied to external services

| Area | Finding and verified result |
|---|---|
| Supabase credit RPCs | `consume_hosted_credits` and `refund_hosted_credits` had explicit EXECUTE grants for anon/authenticated. Applied `credit-rpc-permissions.sql`; both browser roles now false, service_role true. No balances were edited. |
| Supabase refunds | Applied `paddle-refund-hardening.sql` successfully. Refund table exists with RLS. Billing wrapper, base function and adjustment handler are server-only. This installs replay protection; it is not an actual sandbox refund test. |
| Supabase advisor | Fixed mutable search_path on the plan-normalization trigger and removed anon/authenticated execution of the internal `rls_auto_enable()` event-trigger helper. Advisor changed from 0 errors / 4 warnings to 0 errors / 1 warning. Remaining warning: leaked-password protection disabled. |
| Domain email | Added only the two apex ImprovMX MX records and its SPF TXT after inspecting existing DNS. Website records and Resend DKIM/send-subdomain records were preserved. Provider reports Active; owner confirmed delivery to both support/privacy aliases from another email account. No catch-all and no paid ImprovMX plan. |
| Vercel data preferences | Disabled optional “Improve models with this project’s data” sharing and saved. This setting concerns project code/chat; it is not a guarantee about every application's data processor. |

## Code changes ready for review and deployment

- Added `Cache-Control: no-store` to the shared API response setup, including AI/billing error responses; streaming AI also retains `no-transform`.
- Stopped logging raw Paddle portal response bodies on provider errors.
- Updated vulnerable PDF.js 3.11.174 to 6.4.299, disabled eval support explicitly, and bundled its worker locally. Both resume upload paths use the same parser and destroy the task afterwards. No third-party CDN worker is needed.
- Updated Supabase JS within its existing major version to 2.117.3, eliminating the audited production dependency alerts.
- Capped homepage screenshot previews at 900 CSS pixels (assets are 1040 pixels wide), keeping the full-size link.
- Added Google sign-in purpose/scopes copy in English, Bulgarian and Russian (other locales use English fallback). Actual scopes remain `openid email profile`.
- Added the owner-confirmed individual identity and tested public support/privacy aliases to the legal-page drafts. The private receiving inbox and Paddle address are not published.

These source changes have **not** been deployed. External database/DNS changes above are already applied.

## Read-only checks and evidence

| Check | Result |
|---|---|
| Project identity | Supabase JobSensei `neglarewionvwweeypvw`, production main, Free/Nano, Ireland (`eu-west-1`). Vercel project `prj_3JTWAmMy8jp9aUIRKiQ8QuQJgDT8`, owning scope `niksales737-6845s-projects`. |
| RLS | All 14 public tables reported RLS enabled after migration. Existing readable account/device/grant policies are constrained by `auth.uid() = user_id`. |
| Client account/device writes | Aggregated column-privilege checks returned false for every authenticated UPDATE column in accounts and device_registrations. A broad UPDATE policy alone does not grant UPDATE permission. |
| Anonymous data access | HEAD/count requests using the published anon key returned either no accessible rows or permission denial for ten account/billing/security tables. No customer row bodies were retrieved. |
| Public API authentication | Unauthenticated account-status, billing, proxy and portal requests returned 401. A webhook without a valid signature returned 401. No authenticated paid flow was exercised by these probes. |
| Public credentials | `/api/auth-status` publishes the expected anon-role key. Pattern scan of the deployed entry JavaScript found zero secret-like API keys/service-role JWTs. This bounded scan is not proof that every possible credential is absent everywhere. |
| Auth settings | Email and Google enabled; email confirmation enabled; anonymous sign-in and manual identity linking disabled. Site URL is jobsensei.app; redirect allowlist contains only jobsensei.app, with no broad wildcard. |
| Deployment runtime | Vercel uses Node.js 24.x, compatible with the updated packages; local Node.js is 24.14.0. |
| Deployment protection | Vercel Authentication enabled with Standard Protection. |
| Paddle environment | Client `VITE_PADDLE_ENV` is sandbox. Server environment value was not revealed; configuration consistency still needs the actual end-to-end sandbox flow. |
| Existing secrets | Exact-name search confirmed DEEPSEEK_API_KEY and JWT_SECRET exist, both Config, All Environments, added Feb 28. An earlier unfiltered/partially loaded list incorrectly led to a “missing key” report; no replacement was added. |

## Remaining launch blockers and owner actions

1. **Paddle website review failed.** Latest dashboard explicitly says “We couldn't approve your website” and asks for the support email explanation. Obtain that reason, correct the specified issues, and request review. Do not infer the reason from the generic dashboard notice. Identity/payout/tax fields must reflect the operator's real circumstances.
2. **Commercial hosting:** Vercel is on Hobby, restricted to non-commercial personal use. Choose a commercial-permitted plan/host before paid launch. No subscription/upgrade was purchased.
3. **Credential review/rotation:** the two Feb 28 keys remain Config variables. Vercel's April incident advisory recommends reviewing and rotating credentials that were not Sensitive. There is no evidence from this audit that this account was compromised. The owner should create replacements securely, save as Secret, deploy/test, then revoke the old provider key. Coordinate JWT rotation with any remaining legacy access; current secure Supabase sessions are a separate authentication mechanism. Do not revoke working credentials before the replacement deployment is verified.
4. **Backup and restore:** Supabase showed no dashboard backups. Establish encrypted exports or an appropriate managed backup plan, storage/access controls, retention and a tested restore to a separate project. Do not store dumps containing customer data in this Git repository. Free-plan backup guidance: https://supabase.com/docs/guides/platform/backups
5. **Actual sandbox flow:** test sign-in → checkout → completed payment → correct allowance → portal cancellation → approved full refund → revoked entitlement; verify signed, duplicate, late and out-of-order webhooks. Also exercise renewal, failed payment, account deletion and same-email Google/email identity. Local SQL fixtures do not substitute for Paddle deliveries and deployed APIs.
6. **Legal/operational details:** valid public service address, Bulgarian legal/tax obligations for the actual individual operator, provider/DPA/transfer review (especially the DeepSeek API), implemented retention/deletion rules, and reviewed translations. Paddle accepting individuals is not a determination of Bulgarian business/tax eligibility.
7. **Domain replies:** inbound forwarding works, but Gmail “Send mail as” has not been configured or tested. Free ImprovMX excludes outbound SMTP. Existing Resend may provide a free SMTP route after account/domain/limits verification; credentials must be entered by the owner. Keep reply testing and SPF/DKIM/DMARC checks distinct from receiving tests.
8. **Build/test dependency maintenance:** `npm audit --omit=dev` reports zero findings. Full audit still reports 18 toolchain findings (2 critical, 11 high, 4 moderate, 1 low), including Vite/Vitest/Tailwind chains. Do a separate compatible toolchain update and regression review; do not run `npm audit fix --force` blindly. Development servers should stay local. Zero production findings does not mean zero overall risk.
9. **Release verification:** deploy the reviewed source, check authenticated AI and voice, device limits, mobile layouts, support replies, provider failures and token-cost monitoring. Live keys/webhooks must be configured together only after approval and sandbox checks. A real-money smoke transaction requires the owner to complete it.

## Validation completed

- 119 tests passed after dependency/code changes; production build passed.
- Isolated PGlite migration suite passed: reruns, paid grants, duplicate/late events, current/old/partial refunds, refund before payment, genuine renewal, cancellation, deletion, and server-only credit permissions.
- Real fictional PDF imported successfully through Account and onboarding in the development app; the compiled production preview also imported it successfully with the bundled worker. Nothing was sent to AI or saved into a real customer's account.
- Homepage image layout was browser-checked at 900 CSS pixels versus 1040 natural pixels.
- React review: heavy parser remains dynamically loaded only during PDF import, hooks are unchanged, and the dialog's existing keyboard/focus behavior is retained.
- `git diff --check` passed after cleanup.

## Email reply setup reference

If the existing Resend account is on an eligible Free plan and jobsensei.app is verified for sending:

1. In Gmail settings, Accounts and Import → Send mail as → Add another email address, add `support@jobsensei.app` with name “JobSensei Support”.
2. SMTP host `smtp.resend.com`, port 465 with SSL, username `resend`; password is a Resend API key, entered privately by the owner. Prefer a separate sending key limited to this domain where supported.
3. Complete the confirmation email, which arrives through forwarding. Repeat for privacy if needed.
4. Select replying from the address the message was sent to. Test to an external inbox and inspect authentication/From headers.

This is a prepared procedure, **not completed configuration**. SMTP shares Resend's sending limits with API emails; account plan and domain verification must be checked before relying on it.

## Primary references

- ImprovMX Free: https://www.improvmx.com/pricing/
- Vercel Hobby usage: https://vercel.com/docs/plans/hobby
- Vercel Config/Secret types: https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types
- Vercel security advisory: https://vercel.com/kb/bulletin/vercel-april-2026-security-incident
- PDF.js advisory: https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq
- Paddle verification: https://www.paddle.com/help/start/account-verification/what-is-account-verification
- Resend SMTP: https://resend.com/docs/send-with-smtp ; pricing: https://resend.com/pricing

This is a targeted configuration/source audit with bounded production probes, not a penetration test or a guarantee that every workflow is correct.

## Owner follow-up: missing Paddle email and address privacy

The owner checked the inbox and spam folder but received no rejection email. The expanded live dashboard still explicitly identifies website approval as the failed check within overall account verification. The exact reason remains unknown; this is not evidence that identity verification failed.

Direct Website approval settings independently show jobsensei.app as Not approved. Its action menu offers only Remove domain; no self-service resubmission control was visible. The domain was preserved.

Paddle User settings also showed two-factor authentication disabled. The owner should enable it through the account's secure setup flow before live billing; no credentials or MFA settings were changed.

Prepared message for the owner to send to Paddle support (not sent):

> My live JobSensei account shows “Verify your account — Failed” and “We couldn't approve your website” for jobsensei.app. I have not received the explanatory email, including in spam. Please confirm which verification stage failed, provide the specific reason or missing requirements, and explain how to request a new review. I operate as an individual in Bulgaria without a registered company.

The owner prefers not to publish any address. No private address has been copied from Paddle into the site. However, Bulgarian Electronic Commerce Act Article 3 includes natural persons as service providers, and Article 4(1)(2)–(4) requires accessible permanent/registered-office and activity-address/contact information. A mailbox or arbitrary virtual address is not established by this review as a sufficient replacement. Obtain advice on an appropriate legal/business arrangement that protects home-address privacy before removing this launch blocker. Paddle's Merchant of Record role does not itself establish an exemption from the software provider's disclosure duties.

Current Bulgarian ministry text, amended through November 2025: https://www.mtc.government.bg/bg/category/324/zakon-za-elektronnata-trgoviya

Paddle separates domain review, business verification (not required for individuals/sole traders), and identity verification: https://www.paddle.com/help/start/account-verification/what-is-account-verification
