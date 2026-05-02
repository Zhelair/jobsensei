# Secure Auth Rollout Plan

## Why this needs to change

The current access model is not a real account system.

- Access is granted by a locally stored token from `/api/verify-member`.
- The token is not tied to a user record, a device list, or a revocable session table.
- `/api/proxy` only checks that signed token, so there is no real per-user enforcement.
- There is no secure signup, login, logout across devices, device approval, or server-side usage ownership.

This is fine for early access, but it is not enough for a production subscription product.

## Recommended direction

Use **Supabase Auth + Supabase Postgres + Vercel serverless enforcement**.

Why this fits JobSensei well:

- `@supabase/supabase-js` is already in the project.
- Supabase gives email/password, magic links, password reset, email verification, and session handling.
- Vercel API routes can verify Supabase JWTs server-side before allowing AI proxy calls.
- Device registration and subscription access can live in Postgres with row-level security and audit trails.
- Existing Vercel secrets can stay in place and be extended rather than deleted.

## Core product rules

1. Every paying user has a real account.
2. Every protected API route requires a valid authenticated session.
3. Every account can have at most **2 approved devices**.
4. BYOK stays local to the device unless you later choose to offer optional encrypted sync.
5. JobSensei-hosted AI must only run through server-side routes after auth, plan, and device checks pass.

## Suggested architecture

### 1. Identity

Use Supabase Auth for:

- sign up
- sign in
- email verification
- password reset
- session refresh

Frontend:

- Vite app uses Supabase client auth flows
- authenticated user id becomes the canonical owner id

Backend:

- Vercel API routes verify Supabase access tokens on every protected request

### 2. Account and plan tables

Add tables such as:

- `accounts`
  - `id`
  - `user_id`
  - `email`
  - `plan_status`
  - `plan_source`
  - `plan_expires_at`
  - `created_at`
  - `updated_at`

- `device_registrations`
  - `id`
  - `user_id`
  - `device_id`
  - `device_name`
  - `device_label`
  - `last_seen_at`
  - `approved_at`
  - `revoked_at`
  - `created_at`

- `api_usage_events`
  - `id`
  - `user_id`
  - `device_id`
  - `route`
  - `provider`
  - `model`
  - `tokens_in`
  - `tokens_out`
  - `created_at`

- `plan_grants`
  - `id`
  - `user_id`
  - `grant_type`
  - `external_ref`
  - `status`
  - `created_at`

### 3. Device model

Do **not** rely on browser fingerprinting alone.

Recommended approach:

- On first login for a browser, generate a random `device_id`.
- Store it locally on that browser.
- Register that `device_id` in `device_registrations`.
- If the account already has 2 approved devices, block the new device and show a device management screen.
- Let the user revoke an older device to free a slot.

This is not perfect against a determined attacker, but it is far more reliable and honest than fingerprint-only logic.

### 4. Protected API flow

Every protected route should do this:

1. Verify Supabase user session token.
2. Load the account record.
3. Confirm `plan_status` is active.
4. Confirm the incoming `device_id` belongs to that user and is approved.
5. Only then allow the AI or paid action to run.

This should replace the current `JWT_SECRET + ACCESS_CODES` gate for primary access.

## Migration path from the current system

### Phase 1. Real auth without breaking current access

- Add Supabase Auth UI and session handling.
- Keep current BMAC access temporarily as a migration bridge.
- Link an existing BMAC code to a real user account after login.

### Phase 2. Server-side ownership

- Change `/api/proxy` to require:
  - authenticated user
  - active plan
  - approved device

- Stop trusting only the locally stored BMAC token.

### Phase 3. Device enforcement

- Add `device_registrations`
- enforce max 2 approved devices
- add UI to rename or revoke devices

### Phase 4. Clean retirement of legacy access

- remove code-only access as the primary login path
- keep admin/manual grant tools for support cases

## What should stay local

Keep these local by default:

- BYOK provider choice
- BYOK API key
- draft workspace data until you intentionally add sync

This keeps the product safer and simpler.

## Vercel secrets to keep

Do not delete existing Vercel secrets during the migration.

Keep and reuse:

- provider API keys already used by server routes
- webhook secrets
- current proxy-related secrets until legacy access is fully retired

Add new secrets alongside them, for example:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended first implementation slice

The safest next build step is:

1. Add Supabase Auth to the Vite app.
2. Add `accounts` and `device_registrations`.
3. Require auth on `/api/proxy`.
4. Register one device per login and block device 3.
5. Keep BMAC only as a way to grant or map plan access to the account during migration.

That gets JobSensei from "token gate" to "real account + real API restriction" without forcing a full sync system on day one.

## Security audit additions

### Immediate risks in the current implementation

The current BMAC token flow is the main security weakness today:

- `api/verify-member.js` issues a long-lived signed token with no user table, no revocation list, and no device ownership.
- `api/proxy.js` accepts that token directly and does not enforce account state, device approval, or per-user rate limits.
- Both routes currently allow `Access-Control-Allow-Origin: *`, which is too open for a paid production API.
- Access codes are effectively a shared secret list in environment variables, not a real entitlement system.
- There is no account deletion flow, no privacy policy file in the repo, and no truthful sync disclosure yet.

### Password handling decision

The app should **not** store raw passwords anywhere in JobSensei tables, local storage, or Vercel logs.

Recommended rule:

- Let **Supabase Auth** own password collection, reset, verification, and session issuance.
- JobSensei application tables should only reference the Supabase user id and account metadata.
- If you want the lowest-liability launch path, start with:
  - email + password via Supabase Auth, or
  - magic link as the default sign-in option, with password support added after the core account system is stable.

Important:

- Never build your own password table.
- Never sync BYOK keys unless you later add explicit per-user encryption and key management.
- Never expose the Supabase service role key to the frontend.

### Supabase security model for JobSensei

Supabase is a good fit here if you use it conservatively.

Baseline controls:

1. Supabase Auth for identity.
2. Row Level Security on every user-owned table.
3. `anon` key only in the client.
4. `service_role` key only in server code.
5. All plan checks and AI proxy calls enforced server-side.
6. Device approval stored in Postgres and checked on every paid route.

Recommended table ownership pattern:

- `accounts`: one row per authenticated user
- `device_registrations`: approved and revoked devices
- `workspace_snapshots` or equivalent synced data table
- `api_usage_events`: audit and abuse monitoring
- `plan_grants`: support grants, promo grants, billing-origin grants

Recommended RLS rule shape:

- users can read and write only rows where `user_id = auth.uid()`
- support/admin actions happen only through trusted server-side routes
- no sensitive table should rely only on frontend filtering

### Encryption stance

You likely do **not** need custom encryption for every synced row on day one.

Practical recommendation:

- Use Supabase Auth + TLS + RLS + least-privilege backend access as the default baseline.
- Keep BYOK credentials local-only for now.
- If you later sync especially sensitive fields such as resumes, JD text, or notes, consider **field-level encryption** for those blobs only.

Do not over-engineer this early:

- Supabase projects are encrypted at rest by default.
- Supabase itself does **not** recommend new `pgsodium` usage due to complexity.
- Supabase Vault is good for secrets, not as a drop-in answer for all user workspace content.

Best phased approach:

### Phase A

- no synced BYOK
- synced account + device + plan data only
- optional synced workspace data behind RLS

### Phase B

- add field-level encryption only for the most sensitive synced content if real user volume or enterprise demand justifies it

### API security hardening checklist

Before launch with real accounts:

1. Remove wildcard CORS from paid API routes.
2. Verify Supabase JWTs server-side on every protected request.
3. Require approved `device_id` on every paid route.
4. Add per-user and per-IP rate limiting around auth, proxy, and entitlement routes.
5. Log usage events for abuse review.
6. Rotate secrets and document secret owners.
7. Keep AI provider keys server-side only.
8. Add structured audit logs for:
   - login
   - new device registration
   - device revoke
   - plan grant / revoke
   - account deletion request

### Data sync truthfulness

Once account sync exists, JobSensei should stop describing itself as purely local-only.

The honest product line is:

- some data remains local-only
- some data is synced because it is necessary for secure account access and cross-device continuity

Recommended synced categories:

- account id
- email
- plan status
- approved device list
- optional synced workspace content that the user expects across devices

Recommended local-only categories for now:

- BYOK API key
- BYOK provider secret
- any future ultra-sensitive drafts until you explicitly add sync for them

### Privacy / GDPR notes

This is not legal advice, but the product should align with these operational rules:

1. **Data minimisation**: only sync data required to run the service and secure accounts.
2. **Purpose limitation**: explain exactly why account, device, and workspace data are stored.
3. **Transparency**: settings copy, privacy policy, and any store disclosures must all say the same thing.
4. **Accuracy**: if the app syncs data, no screen should still claim everything stays only on-device.
5. **Erasure**: users need a real account deletion path once accounts exist.
6. **Portability readiness**: keep synced user data exportable in a structured format.

### What to say about data collection

Keep it simple and truthful:

- do not claim "no data ever leaves the device" once sync exists
- do not claim "no geographical data" in a broad way if infrastructure logs may still process IP metadata
- instead say the app does not request GPS or background location and only stores the account, device, and workspace data needed to run JobSensei securely

### Billing and promos

Accounts are a product advantage, not just a security cost.

Once accounts exist you can safely support:

- promo grants for first users
- manual support grants
- invite-only access waves
- controlled trials
- per-account usage monitoring
- safer device caps to reduce API abuse

This should happen through `plan_grants`, not through new shared access codes.

### Account deletion requirements

For the web app itself:

- add a clear delete-account flow
- revoke sessions
- revoke devices
- delete or anonymize synced personal data that is no longer required
- document any data you must keep temporarily for fraud, billing, or legal reasons

If you later ship to Google Play:

- apps with account creation must provide an in-app account deletion path
- the Data safety form must match the real behavior of the app

### Store-quality localization

When auth lands, localize these fully before store distribution:

- sign up
- sign in
- password reset
- email verification
- device approval and revoke
- account deletion
- privacy copy
- subscription / promo state
- error messages for auth and entitlement failures

### Recommended next implementation order

1. Add privacy-policy draft and in-app truthfulness updates.
2. Add Supabase Auth and account tables.
3. Replace BMAC token trust with authenticated account checks on `/api/proxy`.
4. Add device approval and 2-device cap.
5. Add account deletion flow and support tooling.
6. Only then decide whether synced workspace content needs extra field-level encryption.
