# JobSensei Privacy Policy Draft

Status: working draft for the web app and future secure-account rollout.

## What JobSensei stores today

- Most profile, project, resume, notes, and tool-history data is stored locally in the user's browser on the current device.
- If the user uses a bring-your-own-key provider, that API key remains local to the device unless JobSensei clearly adds an optional sync feature later.
- AI requests send only the text needed to complete the selected task to the chosen provider.

## What secure account sync will store

When secure account sync is enabled, JobSensei will store only the data needed to run the service safely across devices, such as:

- account identifier
- email address
- plan or entitlement status
- approved device list
- optional synced workspace data if that feature is explicitly enabled

JobSensei does not request GPS or background location.

## Why the data is stored

- to authenticate the user
- to protect paid AI usage from abuse
- to approve up to two devices per account
- to restore access and support account management
- to provide optional cross-device continuity if the user enables it

## Third-party processing

JobSensei may send task content to the selected AI provider in order to generate responses.

- JobSensei-hosted AI requests are processed through JobSensei server routes and the configured AI provider
- BYOK requests are processed by the provider chosen by the user

Each provider processes requests under its own terms and privacy rules.

## Data minimization

JobSensei aims to collect and store only the minimum data needed to:

- run the app
- secure account access
- enforce device limits
- support billing, promo, or entitlement records

## Account deletion

When secure accounts are enabled, users should be able to delete their account from inside the app.

Deleting a secure account should remove or revoke:

- account access
- approved devices
- synced account metadata
- synced entitlement records that are no longer required

Some records may need short-term retention for fraud prevention, billing, or legal obligations. If so, the final policy should explain those exceptions clearly.

## Local data deletion

Users can already clear local browser data from JobSensei Settings. This removes locally stored app data from the current browser.

## Contact and controller details

Add before publishing:

- legal or business name
- contact email
- country and business address if required
- effective date
- last updated date
