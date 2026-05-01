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
