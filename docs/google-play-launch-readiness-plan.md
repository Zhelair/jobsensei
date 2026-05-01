# Google Play Launch Readiness Plan

This document tracks what JobSensei needs before it is safe, compliant, and practical to ship as a Google Play app.

It works alongside:

- [secure-auth-rollout-plan.md](C:/Users/niksa/OneDrive/Documents/GitHub/NEW%20PROJECTS/jobsensei/docs/secure-auth-rollout-plan.md)
- [localization-plan.md](C:/Users/niksa/OneDrive/Documents/GitHub/NEW%20PROJECTS/jobsensei/docs/localization-plan.md)

## Goal

Ship JobSensei to Google Play with:

- a secure real account system
- compliant billing paths
- accurate privacy and data safety disclosures
- polished localization
- a maintainable update process

## Packaging approach

For the first Play release, the simplest route is a **Trusted Web Activity (TWA)** wrapper around the production web app.

Why this is attractive:

- fast path from the current web app to Play
- your live web app content updates can appear in the Play app without resubmitting every UI/content tweak
- avoids building a full native Android app too early

### TWA requirements

- HTTPS for the production site
- web app manifest
- service worker
- Digital Asset Links on the website
- signed Android app bundle (`.aab`)
- Google Play Developer account

### TWA update model

Two kinds of updates matter:

1. Web content updates

- HTML, CSS, JS, text, translations, and normal app logic ship from the live web app
- these usually do **not** need a new Play review

2. Wrapper/config updates

- app icon
- app name
- splash assets
- permissions
- version metadata
- package-level Android config

These **do** require a rebuilt `.aab` and a Play Console submission.

## Reality check

TWA helps with packaging, but it does **not** solve:

- authentication
- API security
- billing compliance
- privacy policy accuracy
- account deletion requirements
- store-quality localization

Those still need to be solved at the product level.

## Security status today

JobSensei is not yet ready to be described as a fully hardened production app.

Current important gaps:

- local app data is stored in browser `localStorage`
- BYOK config is local, not account-managed
- hosted AI access still relies on a legacy token flow
- there is no real account/session/device enforcement yet
- there is no account deletion flow yet
- security headers and CSP still need tightening

## Launch tracks

### Track 1. Auth and API security

Required before real launch:

- Supabase Auth
- `accounts` table
- `device_registrations` table
- max 2 approved devices per account
- server-side entitlement checks before protected AI/API actions
- legacy BMAC support kept as a bridge and plan source

See the dedicated auth rollout doc for implementation details.

### Track 2. Billing and monetization

JobSensei should support multiple entitlement sources:

- `bmac`
- `google_play`
- later `paddle`
- later `stripe`

Recommended model:

- keep BMAC for supporters, promo traffic, and manual grants
- use Google Play Billing for digital purchases made inside the Play-distributed Android app
- optionally add a web billing path later for website-first users

## Google Play billing rule

If the Play-distributed app sells digital app access, subscriptions, or premium features inside the app, Google Play Billing is generally required.

That means:

- do not treat BMAC as the in-app purchase system for Play users
- do not route Play users to an external payment flow for normal in-app digital unlocks unless the app is eligible and intentionally configured for approved alternative billing programs

## Compliance requirements

Before submission, prepare:

- privacy policy
- accurate Play Data safety form answers
- account deletion flow if account creation exists
- clear explanation of what data is local, what data is sent to AI providers, and what data is account-linked

## Localization status

Localization is not finished yet, and it is a launch blocker.

Why it matters:

- Play screenshots and listing text should match the product quality
- longer labels must fit on smaller screens
- partial translation makes the app feel unfinished

Current priority:

1. finish English source cleanup
2. finish shared settings/account/paywall copy
3. complete job tracker / applications / tools coverage
4. run mobile QA in every supported language

## TWA operational checklist

When the app is ready, prepare:

- production domain
- manifest validation
- service worker validation
- Digital Asset Links
- Android signing keystore
- package name
- icons and splash assets
- Play listing assets
- test release in internal testing track

## Suggested launch order

1. finish secure auth foundation
2. finish localization pass
3. tighten privacy/security disclosures
4. decide Play billing path
5. build TWA wrapper
6. test on internal Play track
7. fix policy/disclosure issues
8. submit production release

## Immediate next steps

1. Implement Supabase Auth and device registration.
2. Keep BMAC as a legacy supporter and entitlement source.
3. Continue localization, especially Settings, Tools, and remaining hardcoded strings.
4. Add store-readiness tasks for privacy policy, account deletion, and billing.
