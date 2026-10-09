# Verified JobSensei product inventory — 9 October 2026

## Evidence and limits

Opened the live desktop app and inspected Account after authentication state loaded, Today, Applications/Offers/Discover, application Workspace/Capture/Research, all 12 preparation-tool entry screens, Gap Analysis saved application-scoring output, Learning library, an existing tutor conversation, quiz history, Settings and expanded BYOK controls. Used existing fictional audit fixtures. No new AI requests, searches, microphone permission, payments, deletion, local-data clearing or provider configuration changes were performed. Visible screens and saved outputs establish implemented capabilities, not a fresh end-to-end pass of every AI output or live billing state. Where navigation changes data or invokes providers, traced the source instead of claiming an executed test.

The browser session is an audit account on Free; founder's supplied screenshot is Pro. Conditional Paddle controls were confirmed in source rather than claimed visible in that account.

## Existing capabilities

| Area | Observed capability | Evidence/important distinction |
| --- | --- | --- |
| Account | Hosted/BYOK status, Free/Pro credit panels, allowance, per-request cost, balance/date, linked email, refresh/sign-out | Existing UI; extend it rather than build a new account dashboard |
| Account | TXT/PDF resume upload, editable text, save per project, profile setup | Existing resume/profile area; no relocation proposed |
| Access | Approved devices, count, revoke action, two-device policy | UI plus existing server helpers; Google must reuse this model |
| Billing | Paddle Manage billing action and portal handler | Conditional on Paddle-backed account; existing scaffold is not proof of configured production payments |
| Data | Export All Projects, Export Project, Import Project, Clear All Data | Live Settings; reuse existing functions and retain local-clearing flow |
| Feedback | Bugs, suggestions, general feedback, job-source requests | Existing Account support area; no message sent |
| Today | Active application, six-step preparation progress, pipeline/learning metrics, prep entry points, recent saved activity | Preserve intended repeated context and navigation |
| Applications | Kanban stages and workspace list, add/edit, active application, import/export jobs | Existing tracker, not a proposed future feature |
| Job workspace | Saved JD, Capture editor, Research notes, role-specific links to preparation tools | Shared role context is reused by relevant tools |
| Company notes | AI research drafting, people spoken to, things mentioned, prep notes, tools/systems, culture, questions, note summarization | Live controls plus source; current research call uses AI-only context, not verified live web search |
| Discover | Keywords, location/remote input, public LinkedIn or company-board search, recency, cached results, open/save/dismiss/hide-viewed | Existing feature; prior source/screenshot review verifies result actions. Coverage/freshness repair remains required |
| Gap Analysis | Fit analysis, App Scoring with strengths/gaps/subscores, Red Flags, saved history | Live tabs and existing saved scoring result |
| Gap -> Learning | “Study These Gaps” buttons; create/open topic in Learning tutor with application linkage | Live buttons; traced `addStudyTopic`, deduplication and `openLearningTopic` routing. Did not create another topic |
| Learning | Topic library, custom topics, category/difficulty/status, due reviews | Live UI plus source; not restricted to the starter AML/financial topics |
| Learning | Conversational AI tutor, New to this/Have basics/Go advanced, voice/text, saved conversations | Opened existing SQL tutor conversation; no new response requested |
| Learning | Quizzes, scored history, Notes & Workbook, saving tutor responses, note summaries, cheat cards and review scheduling | Opened quiz history and Notes & Workbook with Summarize Notes/Generate Cheat Card controls; source links quiz outcomes to spaced-review scheduling |
| Interview Simulator | HR Screen, Technical Panel, Competency-Based, Stress Interview; 5/10/15 questions; JD/resume prefill, saved sessions, debrief | Live setup and source; existing voice/text control checked earlier. No fresh interview run in this pass |
| Question Predictor | JD/background input, predicted question sets and saved history | Live tool screen and existing history |
| STAR Builder | Story bank, new story, full analysis, editing, copy, saved answers/tags | Live story bank; no edits or deletion |
| Tone Analyzer | Answer analysis, confidence/clarity/professionalism/specificity and stronger phrasing | Live entry screen and saved result summary |
| Follow-up Email | Active company/role/prep notes, interviewer details, Warm/Professional/Enthusiastic styles | Live tool screen |
| Elevator Pitch | Role/background input and saved pitch history | Live tool screen |
| Cover Letter Optimizer | JD/resume, three versions and keyword analysis, saved history | Live tool screen and existing output summary |
| Resume Checker | Resume/JD review, ATS-oriented and recruiter-oriented feedback, saved results | Live tool screen and existing scores; model advice is not a real employer ATS certification |
| LinkedIn Auditor | Pasted headline/About/experience review, scores and improvements | Live tool screen; does not sign in to LinkedIn or edit a profile automatically |
| Visual Design Review | Resume screenshot/image review | Live screen explicitly requires a compatible vision-capable BYOK model; not included in current hosted text-model capability |
| Transferable Skills Coach | Existing experience + target role/context, reframing advice | Live tool screen and existing result summary |
| Offers | Salary/bonus notes, 1–5 ratings, weighted comparison/score, AI Offer Advisor | Live offer screen. Criteria: salary, growth, culture, work-life, benefits, flexibility; customizable weights |
| Project organization | Separate local projects and active project context | Existing ProjectContext/ProjectSwitcher; no workspace cloud sync |
| Languages | English, German, Bulgarian, Russian, Spanish (Spain), French, Italian, Polish, Portuguese (Brazil) | Nine configured options; Settings visibly exposes all nine |
| Personalization | Existing themes, optional effects, voice controls, Sensei/Drill | Retain these and existing shell; voice capability depends on browser/device |
| Capture extension | Downloadable development Chrome extension for job pages/selected JD text | Live Settings says development/unpacked install; Chrome Store entry is not live |

## Existing versus missing account work

Keep the current plan/credits cards, account identity, resume/profile, devices, Settings backups and local-data clearing. Extend the current conditional Paddle checkout/portal code for trusted purchase mapping, scheduled cancellation/status, replay-safe renewal credits and recovery. Add Google to existing Supabase login. Hosted deletion API/helper exist but no component invocation was found; wire its confirmation UI and correct billing/deletion behavior. Do not build a duplicate account/export/clear-data subsystem.

## Date-label finding relevant to founder screenshot

`src/lib/credits.js` sets Pro `statusDate` to `planExpiresAt || resetAt` and labels it `active_until`. Thus “Active until 20 October” can display the credit-period reset date even when database plan expiry is NULL. This can make an apparent expiration date visible without any actual access-expiry value. Inspected source establishes this fallback; live database values/routines remain unverified.

Plan a focused correction: keep actual plan end, next billing date and credit reset as separate fields and labels; never manufacture paid-access expiry from reset. Combine with authoritative expiry enforcement and legacy-grant migration, not a cosmetic date change alone.

## Product positioning and first-visit content

The central differentiator is connected preparation: saved resume/job context -> fit analysis -> targeted learning -> practice -> saved application progress -> offer comparison. Learning is a main capability, and Offers/Discover belong in the product overview.

Suggested hero: **“Prepare for your next role—from finding a job to comparing offers.”**

Supporting copy: “Bring your resume, find or capture roles, check your fit, study skill gaps and practise interviews by voice or text—all in your JobSensei workspace.”

Use seven main story chapters in the existing shell/theme system:

1. **Bring your experience.** Resume upload and reusable project context.
2. **Find roles and manage applications.** Discover plus manual/extension capture; saved JD, stages and preparation progress. State public-index limitations without promising exhaustive current jobs.
3. **Research and prepare company notes.** AI-drafted company context, editable screening notes and questions to ask.
4. **Check and strengthen your application.** Gap Analysis, App Scoring/Red Flags, Resume Checker, cover letters, transferable skills and LinkedIn improvements. Additional tools can be selectable previews within the chapter.
5. **Turn gaps into learning.** Demonstrate an actual Study button leading to a tutor topic, then quizzes, notes and reviews. This must be a main demo rather than a footer feature.
6. **Practise the interview.** Voice/text mock interviews, four modes, Sensei/Drill, predicted questions, STAR answers, tone/pitch preparation and saved debriefs. Browser-dependent speech support is explained accurately.
7. **Follow through and compare offers.** Follow-up drafts, application progress/history, compensation notes, weighted offer comparison and AI advice. Scores reflect entered ratings and preferences, not verified employer facts.

Seven chapters need not mean seven huge full-screen blocks: use a concise connected desktop story with selectable feature detail and stacked mobile previews. Preserve ordinary scrolling and reduced-motion fallback. Show the names of all nine languages near learning/interview sections. Local-only workspace disclosure remains near Start free; billing/pricing follows demonstrated product value. BYOK/vision dependency appears beside the relevant feature, not buried in a broad “all tools included” claim.

Recommended demo priority: Gap -> Study -> Tutor/Quiz; voice mock interview; application/company context; Discover -> saved role; weighted Offers. Use existing fictional fixtures and actual UI. Do not claim a newly executed AI/search/payment test where only a control or prior saved output was inspected.

## Next steps

1. Use this inventory as the source of truth for page copy and scope. Preserve existing account/features/layout.
2. Diagnose deployed permissions/expiry and correct the reset-as-expiry display; agree treatment of legacy balances.
3. Complete Paddle sandbox lifecycle and deletion safeguards; reuse existing portal/Account controls.
4. Add Google to existing auth/device model.
5. Repair Discover recall, dates and availability evidence before strengthening discovery claims.
6. Make a reviewable start-page storyboard/mockup from the actual seven product chapters and recorded fixtures, then implement after the planning phase.
