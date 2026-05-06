# JobSensei Auth + Settings Handoff

Last updated: 2026-05-06

This file is a clean restart point for the next chat.

## Goal

Simplify JobSensei auth, access unlock, device management, and privacy text without overcomplicating the product.

The user wants:

- a simple, secure unlock flow
- local-first app data
- Supabase used only where actually needed
- 2-device max logic
- tester / Vercel-secret fallback kept alive
- short, clear legal/privacy copy
- everything matching the app themes and supported languages

## Important Product Decisions

### 1. Main unlock flow

Use one main entry flow everywhere:

- Settings
- onboarding / first app entry
- paywall / locked AI entry

The same input/button should handle both:

- `email`
- `tester / Vercel secret code`

### 2. Final unlock behavior

If input is a tester code:

- unlock through legacy fallback

If input is an email and that email has an active paid grant:

- send magic link
- user clicks link
- user becomes signed into the app
- access unlocks
- current device gets approved automatically

If input is an email and no active grant exists:

- show clear `no access found for this email`
- keep Buy Me a Coffee CTA visible

### 3. Tester flow must stay

Do not remove the tester / Vercel-secret flow.

It should remain as a valid fallback for:

- the app owner
- trusted testers
- temporary internal testing

But it should not confuse the normal user flow.

### 4. Device management

Secure account/device management should live inside `Plan and AI Access`.

It should show:

- signed-in email
- approved devices
- current device badge
- revoke / unlink action
- confirmation popup
- clear 48-hour cooldown warning

If 2 devices are already used:

- show branded modal/popup
- explain the limit
- explain that unlinking a device starts a 48-hour cooldown before a replacement device can be approved

### 5. UI layout direction

The user prefers:

- remove the wasteful `Current mode` card
- make the `Profile` card smaller
- use the freed space for device management

### 6. Data Management direction

`Data Management` should stay in Settings.

It should:

- remove the old bullet about planned secure sync / GPS / background location
- keep local-data explanation short and clear
- include an expandable short legal section
- link to:
  - `Terms & Conditions`
  - `Privacy Policy`
  - `Cookie / Storage Notice`

The legal text should be:

- short
- understandable
- translated for app languages where practical

### 7. GDPR / consent direction

Current recommendation:

- likely no full cookie banner yet if only necessary auth/session/storage is used
- still need privacy + terms + storage notice
- show a short agreement line like:
  - `By continuing, you agree to the Terms and Privacy Policy.`

Do not make this heavy or annoying.

## Supabase Position

The user was worried that Supabase became a mess.

Clarification:

- most of the many visible tables are Supabase internal `auth.*` tables
- they are not JobSensei business tables
- they are not the same thing as app data bloat

JobSensei app data is intended to remain mostly local.

### Desired minimal JobSensei-owned server-side schema

Keep only:

- `accounts`
- `device_registrations`
- `plan_grants`

Do not keep unnecessary extra logging/analytics/account-audit complexity unless there is a real product need.

## Current app-data philosophy

Most user workspace data should stay local:

- profile
- projects
- applications
- notes
- resume
- learning/workspace content
- settings/preferences where appropriate

Supabase should mainly hold:

- identity
- session/auth state
- plan grant state
- approved-device state

## Buy Me a Coffee direction

Normal production path should be:

1. user buys
2. BMAC webhook creates or updates `plan_grants`
3. user enters email in `Unlock app`
4. app sees matching grant
5. app sends magic link
6. user clicks link
7. app signs them in and unlocks
8. device is approved

The user also asked whether BMAC needs an API key.

Working assumption:

- webhook + secret is the important part
- not a frontend API key

## What the user explicitly wants to avoid

- overcomplicated auth
- multiple confusing unlock paths exposed equally to normal users
- extra subscriptions unless clearly necessary
- giant legal walls of text
- accidental deployment/pushing without clear intent
- hand-wavy explanations that confuse branch state vs live app state

## What went wrong in this chat

This should be treated as lessons for the next attempt:

- too much confusion between local code, branch state, and live app state
- too much talking instead of crisp confirmation
- some changes were described before they were visually verified by the user
- too much drift between planning and execution

Next chat should stay tighter:

- inspect current repo state first
- confirm what is already on branch
- show what is local-only vs already on GitHub
- make small, reviewable changes

## Desired next-chat workflow

1. Read current branch state in this repo.
2. Compare current code with the desired product direction above.
3. Make a minimal plan before new edits.
4. Keep changes reviewable in GitHub app.
5. Do not talk about deployment unless explicitly asked.

## If starting auth work from scratch

Recommended implementation order:

1. Unify `Unlock app` input/button logic.
2. Keep tester code fallback working.
3. Make email path check grant -> send magic link.
4. On successful sign-in, auto-claim grant and approve device.
5. Replace old secure-sync copy with real device management UI.
6. Clean up `Data Management` and legal section.
7. Only after UX is solid, wire/verify BMAC webhook.

## Notes about files

If the next chat wants to be conservative, treat these as the likely main areas to inspect first:

- `src/components/Settings/Settings.jsx`
- `src/components/Onboarding/OnboardingWizard.jsx`
- `src/components/shared/PaywallModal.jsx`
- `src/context/AIContext.jsx`
- `src/context/AuthContext.jsx`
- `src/context/localizationPatches.js`
- `api/verify-member.js`
- `api/_lib/authBridge.js`
- `supabase/secure-auth-bridge.sql`

## Final product summary

The intended user experience is:

- one clear `Unlock app` flow
- email unlock for real customers
- tester-code unlock for internal/testing fallback
- secure sign-in tied to real access, not separate confusing forms
- device management that actually explains itself
- short legal/privacy text that does not feel corporate or bloated

