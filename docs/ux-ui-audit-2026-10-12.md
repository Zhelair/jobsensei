# JobSensei UX/UI audit and design plan

Date: 12 October 2026. Status: planning only; no product UI changes made.

## Direction

Use the approved A — Refined dark concept as the composition reference. Preserve Dark, Daylight and Neon as equal supported themes. The composition, content hierarchy and interaction behavior should be shared; palette and surface treatment should follow the selected theme. Do not flatten intentional application context or replace the existing identity with a generic template.

Separate a persistent Home destination from Today. Home explains the product and pricing; Today helps an existing user take the next action. Visiting Home must not reset profile onboarding, active application, project, authentication or saved work.

## Evidence and coverage

Audit performed against jobsensei.app in the in-app browser using an existing fictional audit account and fictional resume/application fixtures. Desktop viewport was approximately 1254px wide. Responsive screenshots were inspected at 390×844, 375×812 and 768×1024. DOM dimensions confirmed the phone and tablet sizes after responsive rendering settled. These are desktop-browser responsive checks, not physical-device tests.

| Surface | Actually inspected | Limits |
| --- | --- | --- |
| Today | Active focus, selector, progress, hubs, recent activity, contextual Guide | Empty first-visit state covered by previous homepage/source review, not recreated here |
| Applications | Kanban, Add form, Discover filters and cached result, Workspace list, application workspace, Capture, Research, advanced tools | Did not create/delete jobs, change stages, import files or run fresh discovery |
| Offers | Salary/bonus inputs, six ratings, aggregate score and AI advice entry | Did not change ratings or request advice |
| Interview Prep | Simulator setup and four modes, Predictor, STAR story bank, Tone, Follow-up, Elevator Pitch, histories present | Opened every tool form; did not execute every AI generation or microphone flow |
| Prep Tools | Gap Analysis, App Scoring, Red Flags, Cover Letter, Resume Checker and saved result, LinkedIn, Visual Design Review, Transferable Skills | Vision tool unavailable with hosted provider; no personal key entered |
| Learning | Topics/filters, saved study conversation, Done behavior, quiz history and saved review, Notes, Add Topic form | Did not submit new quiz, create topic, edit/delete note or run new AI request |
| Account | Credits, paid-period end, cancellation message, billing entry, resume, profile modal, devices, feedback/BMAC | No payment, account deletion, device revocation, feedback submission or file upload in this audit |
| Settings | Language/voice, backup controls, privacy/legal links, extension panel, expanded BYOK form | Inspected link destinations and layout; did not certify legal content, install extension, clear storage or save config |
| Global | Desktop sidebar/project menu, mobile bottom navigation and More menu, Guide, all three theme appearances | No full screen-reader audit, native keyboard/mobile keyboard, voice permissions or all language combinations |

This is broad UX coverage of the current visible app, not a claim that every backend action has been regression-tested. Earlier sandbox billing validation is separate.

## Prioritized findings

### P1: tablet header clips actions

At 768px, the desktop sidebar consumes 224px and the desktop header exposes controls beyond the viewport: Sensei extends to x≈818 and Guide to x≈908. The page itself reports width 768, so there is no page scrollbar to recover them. Move to compact navigation/header at a breakpoint based on available content width, or put secondary controls in More. Keep language, credits and contextual help reachable.

### P1: navigation intent is unclear in learning

The study view has an icon-only back button without an accessible name. Done stays in the study screen; it is a completion control rather than an exit. Label it Mark complete, show completion feedback, and provide a named Back to Learning action. Topic card edit/delete icons and note controls also need accessible names.

### P1: learning notes expose raw Markdown

Saved notes visibly display ## headings, ** emphasis and pipe-table syntax as plain text. A SQL lesson becomes difficult to scan and loses code/table semantics. Use a safe consistent Markdown renderer for learning responses and saved notes, with horizontally scrollable tables/code inside their own containers. Do not rewrite or discard existing note data.

### P1: separate Home from Today

The public introduction is first-visit gated, with no persistent Home item. Add Home and preserve Today as the working dashboard. On phones, keep the five current working destinations and offer Home through the brand link and More menu rather than adding a sixth crowded bottom item. Confirm the exact navigation in mockups first.

### P2: current screens compete for attention

Today has two workspace entry buttons; the workspace has repeated Save Workspace and a duplicated STAR Builder action. The context itself is useful. Give each section one clear primary action, keep supplementary review actions visibly secondary, and remove exact duplicates. Six workflow steps should read as one journey, with the next step emphasized and completed steps compact but reviewable.

### P2: mobile board needs a clearer browsing mode

The 390px Kanban shows a single card column and part of the next empty stage, plus a horizontal scrollbar. This is an intentional scrolling board, not global overflow. Prefer a mobile List/Board switch or a stage selector with counts; preserve horizontal Board as an option with a visible swipe cue. Move Export, Import and Sync to an overflow menu so Add and the selected view get priority.

### P2: tool consistency and context inheritance

Most tools show the active job context and reusable background. Elevator Pitch opens with an empty target role despite a selected application. Use an editable default from the active role, make inherited context visible and allow overrides. Group tool forms into Context → Inputs → Generate → Result, with consistent back/history controls. Name history entries by role, tool subtype and date; repeated Interview Simulator entries are otherwise hard to distinguish.

### P2: completion and scores need meaning

6/6 means saved workflow output, not proven interview readiness. Explain that distinction. ATS/recruiter numeric scores should be described as AI assessments, not employer-system scores or hiring predictions. Offer scores are personal weighted comparisons. Replace overconfident copy such as perfect email and most likely questions with grounded language.

### P2: Account and Settings organization

Account should prioritize plan, balance, renewal/paid-period end and billing in one compact summary. Put resume/profile, devices and feedback into clearly separated sections, with mobile anchor navigation if needed. Keep cancellation's continued-access explanation. Settings should group Appearance & language, AI provider, Data & backups, Extension, and Privacy & legal. Its current introduction mentions resume although resume lives in Account.

### P2: privacy/legal links are too prominent

The five links wrap correctly at 375px with no document overflow. Keyboard focus is visible. They are styled as action buttons and vary in width. Use a quiet list with external-link indicators and consistent touch rows, leaving backup actions visually primary. Preserve every legal destination and local-storage disclosure. Existing button heights were around 38px; target at least 44px for comfortable touch actions.

### P2: page navigation can retain an unrelated scroll position

Moving from a scrolled Settings view to Today initially showed the lower dashboard content. Establish explicit scroll behavior: top on major destination changes, preserve local position on back to a list or returning to an in-progress task. Avoid surprising resets during typing.

### P3: unavailable features should guide recovery

Visual Design Review explains that hosted DeepSeek cannot analyse images and asks for a compatible personal provider, but upload remains offered while analysis is disabled. Show a clear capability state and a direct Settings action. Avoid making the user upload before discovering they cannot proceed. Keep the extension's development status visible.

## Theme design contract

| Role | Dark | Daylight | Neon |
| --- | --- | --- | --- |
| Base | Navy | Warm ivory | Deep purple |
| Primary action | Teal | Existing coral/teal hierarchy | Magenta/violet |
| Surface | Navy/slate with restrained borders | Light neutral with clear separation | Purple with controlled luminous accents |
| Text | High-contrast light text | Dark warm text | High-contrast light/lilac text |

Use semantic tokens for canvas, surface, elevated surface, border, primary text, secondary text, muted text, action, focus, success, warning and danger. No hard-coded dark-only hero text or screenshot containers. Keep one spacing/type/radius system. Decoration is optional, must respect Visuals off and reduced motion, and must not impair reading. Verify contrast numerically during implementation; this audit did not certify WCAG contrast ratios.

## Mockups to approve before coding

1. Home desktop in Dark: hero, real product preview, three workflow stages, compact feature demonstration, Free/Pro pricing, FAQ and legal footer.
2. The exact same Home in Daylight and Neon, not a new composition for each theme.
3. Home at 390px: stacked headline/CTA, readable product detail, no desktop screenshot reduced to illegible text, stacked pricing and compact navigation.
4. Today desktop and mobile: one next action, compact context, restrained supporting stats and recent activity.
5. Application workspace desktop and mobile: guided steps, editable context, reviewable completed outputs and optional advanced tools.
6. Settings mobile plus Account summary; demonstrate the legal list and billing state.

Product preview data must be illustrative and labeled when fictional. Prefer real app screenshots for the final homepage. Pricing remains €8/month plus applicable tax; Free 465 credits and Pro 25,110 credits, with 31 credits per hosted request. Show BYOK as an alternative, not a third subscription tier. Workspace remains browser-local; account access does not imply sync.

## Implementation order after design review

1. Fix navigation/accessibility/Markdown/tablet header defects.
2. Establish shared semantic styles and theme parity with representative components.
3. Add persistent Home and implement approved Home composition.
4. Improve Today, workspace, mobile board and tool consistency in small reviewable changes.
5. Refine Account, Settings, learning and history presentation.
6. Verify 375/390/768/desktop, all themes, long localized labels, empty/populated/loading/error states, keyboard navigation, form focus and backup preservation. Physical phone testing must include touch, keyboard, microphone and file picker.

## Screenshots

Evidence saved under C:/Users/niksa/.codex/visualizations/2026/10/12/01a13062-ede3-7e51-81db-94713dcbd3b5:

- audit-mobile-learning.png
- audit-mobile-board.png
- audit-mobile-legal.png
- audit-tablet-header.png

Browser restored to its default size and Dark theme. No user workspace data cleared, no production UI code modified.
