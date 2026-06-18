# JobSensei Chrome Web Store Launch Kit

Last updated: June 18, 2026

## 1. Position the extension the way reviewers expect

The Chrome extension should be presented as a **single-purpose capture tool**, not as "the whole JobSensei app in Chrome."

Approval-safe single purpose:

`Capture the current job page or selected job-description text and send it into JobSensei so the user can track the application and continue interview prep in the app.`

Why this matters:

- The extension itself captures job pages, selected text, and opens JobSensei.
- The extension does **not** itself run mock interviews, gap analysis, salary negotiation, or all app features inside the popup.
- Chrome's review guidance is stricter when the store listing promises broader functionality than the extension actually delivers.

## 2. What not to claim in the store listing

Avoid these claims in the extension title, summary, and first paragraph:

- `all JobSensei features in Chrome`
- `full AI job coach inside every tab`
- `no accounts / no servers / no data collected`
- `best`, `fastest`, `#1`, or other superlatives

Why:

- The live app now has secure sign-in, magic links, approved devices, hosted credits, and analytics.
- The extension should describe the **capture workflow honestly** and mention the wider app only as the next step after capture.

## 3. Approval-safe store listing draft

### Title ideas

Keep it clear and narrow:

- `JobSensei Capture`
- `JobSensei Job Capture`

Best pick:

`JobSensei Capture`

### Summary (132 chars max)

Recommended summary:

`Capture job pages into JobSensei to save the role, company, URL, and JD text, then continue prep in one workspace.`

### Long description draft

`JobSensei Capture helps you move a live job post into JobSensei in a couple of clicks.`

`Open a job page, review the detected company, role, URL, and job description, then send that capture into JobSensei to create or update your application workspace.`

`What the extension does:`

- `Captures the current page's company, role, job URL, and visible job-description text.`
- `Lets you highlight selected job-description text and send only that selection with the right-click menu.`
- `Opens JobSensei and sends the capture into your tracker workspace on the same browser/device.`
- `Works with the JobSensei side panel or popup flow, depending on how you want to capture.`
- `Stores only extension UI preferences locally in Chrome, such as theme, visuals, and language.`

`How JobSensei access works:`

- `Free accounts can start with email sign-in and a magic link.`
- `Free currently includes 531 hosted AI credits every 31 days.`
- `Users can also bring their own API key (BYOK) inside JobSensei.`
- `Pro access can be unlocked separately through Buy Me a Coffee.`

`Important: this extension's single purpose is capture. The broader JobSensei app is where users continue tracking, notes, and interview preparation after the capture is sent.`

## 4. Privacy tab answers for the dashboard

### Single purpose

Paste this:

`Capture job-page information and selected job-description text, let the user review it, and send it into JobSensei to create or update an application workspace.`

### Permission justifications

`activeTab`

`Used to read the currently active job page only after the user opens the extension and asks it to capture the page.`

`contextMenus`

`Used for the right-click action that lets the user send selected job-description text to JobSensei.`

`scripting`

`Used to read the visible job-page content from the active tab and to hand off the reviewed capture into the JobSensei web app tab.`

`sidePanel`

`Used to let the user keep the capture UI open in Chrome's side panel while reviewing job-page information.`

`storage`

`Used to store extension UI preferences and temporary capture handoff data locally in Chrome.`

`tabs`

`Used to find, focus, create, update, and reload the JobSensei tab during the send-to-app handoff flow.`

`host_permissions: https://jobsensei.app/*`

`Used so the extension can open JobSensei and deliver the reviewed capture into the user's JobSensei workspace.`

`host_permissions: https://*.vercel.app/*`

`Used for preview or fallback JobSensei deployments during development and release verification. Remove this before production submission if it is no longer needed.`

`host_permissions: http://localhost/* and http://127.0.0.1/*`

`Used only for local development. Remove these before the production Chrome Web Store submission.`

`optional_host_permissions: https://*/* and http://*/*`

`Used only when the user explicitly grants runtime access for the current site so the side-panel capture flow can read that site on demand.`

### Remote code

Answer:

`No, this extension does not execute remote code.`

### Data use

Be ready to disclose at least:

- `Website content`
- `User activity related to the page capture flow`
- `Locally stored extension preferences`

And clarify:

- `The extension captures company, role, job URL, page title, and visible or user-selected job-description text.`
- `This data is used only to provide the capture-to-JobSensei feature requested by the user.`
- `Sign-in happens on jobsensei.app through email magic links; the extension itself does not collect passwords or payment card data.`

## 5. Reviewer test instructions draft

Paste something close to this into the dashboard's test instructions:

`This extension is usable without a paid purchase.`

`Core review flow:`

`1. Install the extension and open any public job post page.`
`2. Click the extension icon.`
`3. Review the detected company, role, job URL, and job-description text.`
`4. Click "Send to JobSensei".`
`5. The extension opens JobSensei and creates or updates the matching application workspace.`

`Optional second flow:`

`1. Highlight job-description text on a job page.`
`2. Right-click and choose the JobSensei capture action.`
`3. The extension opens its capture UI with the selected text prefilled.`

`Optional account flow:`

`1. In JobSensei Settings, enter an email address.`
`2. JobSensei sends a magic link for sign-in.`
`3. Free accounts can start with hosted credits, and users can also configure BYOK in Settings after sign-in.`

`No paid purchase is required to verify the extension's core capture behavior.`

## 6. Submission checklist before uploading

- Remove localhost host permissions from the production manifest if they are not required.
- Remove `https://*.vercel.app/*` from production if the store build only targets `https://jobsensei.app/*`.
- Double-check that the zip contains only the extension files, icons, and no dev-only artifacts.
- Prepare at least 3 real screenshots of the current extension UI at `1280x800`.
- Prepare the required `440x280` promo tile.
- Re-test the context-menu capture flow on LinkedIn Jobs, jobs.bg, and one generic ATS/careers page.
- Re-test the send-to-JobSensei handoff when JobSensei is already open in another tab.
- Verify the privacy policy URL is public and live.
- Keep the listing text consistent with the actual extension behavior in every locale.

## 7. Current repo risks I would fix before submission

### Medium risk

`extension/manifest.json` still includes development host permissions:

- `https://*.vercel.app/*`
- `http://localhost/*`
- `http://127.0.0.1/*`

These are explainable for development, but they add reviewer scrutiny. I would ship a production manifest without local hosts.

### Medium risk

`docs/app-summary-guide.md` still describes JobSensei as:

- `no accounts`
- `no servers`
- `no surveillance`
- `no backend`

That no longer matches the live product architecture and should not be reused in the Chrome listing.

### Low risk

The privacy policy had no explicit Chrome Web Store Limited Use statement. This is now added to the public privacy policy page.

## 8. Recommended next move

Best path:

1. Prepare a production-only extension package with trimmed host permissions.
2. Capture real store screenshots from that production build.
3. Submit with the copy in this document.
4. Use the free email magic-link path in reviewer instructions so the review team does not hit a paywall.
