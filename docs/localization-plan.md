# JobSensei Localization Plan

This document is the working plan for turning JobSensei into a fully localized app, using English as the source of truth before translating into Russian, Bulgarian, Spanish, Portuguese, German, French, Italian, and Polish.

## Goals

- Every visible UI string should come from the translation dictionary.
- English remains the proof/source language.
- Product terms stay consistent across every language.
- Translations should sound natural to native speakers, not literal or machine-like.
- Layout must survive longer labels in German, Polish, Portuguese, Spanish, and French.

## Current State

The app already has a partial translation system in `src/context/LanguageContext.jsx`.

The first code scan found about 900 candidate visible strings outside that dictionary. Some are false positives from config, developer prompts, or styling, but the main product areas are clear.

## Phase 1 Inventory

Primary files and estimated localization weight:

| Area | Main files | First-pass count | Notes |
| --- | --- | ---: | --- |
| Applications | `src/components/JobTracker/JobTracker.jsx` | 206 | Biggest user-facing area. Stages, tabs, add flow, workspace, offers, notes, stats. |
| Tools | `src/components/Tools/Tools.jsx`, `src/components/GapAnalysis/GapAnalysis.jsx`, `src/components/STARBuilder/STARBuilder.jsx` | 203 | Many tool names, prompts, histories, buttons, errors, result labels. |
| Guide | `src/components/Layout/TopBar.jsx` | 108 | Guide popovers and guided tour. Good early conversion target because strings are centralized. |
| Learning | `src/components/LearningSection/LearningSection.jsx` | 84 | Topics, quiz, tutor, notes, review states. Starter topics may need separate treatment. |
| Settings | `src/components/Settings/Settings.jsx`, `src/components/Settings/DeepSeekGuide.jsx` | 85 | Plan, AI config, resume upload, project data, language/voice, BYOK guide. |
| Today | `src/components/Today/TodayPage.jsx`, `src/components/Dashboard/Dashboard.jsx` | 69 | Daily command center, active focus, progress cards, quick actions. |
| Interview | `src/components/InterviewSimulator/InterviewSimulator.jsx` | 34 | Modes, session setup, errors, history, controls. |
| Onboarding | `src/components/Onboarding/OnboardingWizard.jsx` | 305 raw | Already internally localized, but should be moved into the shared dictionary. Raw count includes per-language copy. |
| Navigation and Projects | `src/components/Layout/Sidebar.jsx`, `src/components/Layout/BottomNav.jsx`, `src/components/Projects/ProjectSwitcher.jsx` | 22 | Mostly small labels, project actions, import/export messages. |
| Shared | `src/components/shared/*` | 27 | Paywall, voice bar, capture bridge, toast/visual messages. |
| Notes | `src/components/Notes/Notes.jsx` | 14 | Notes workbook labels, placeholders, delete confirms. |

## Phase 2 English Source Cleanup

Before translating, create a complete English dictionary grouped by feature:

```js
{
  nav: {},
  common: {},
  buttons: {},
  errors: {},
  today: {},
  applications: {},
  workspace: {},
  interview: {},
  learning: {},
  tools: {},
  settings: {},
  onboarding: {},
  guide: {},
  projects: {},
  notes: {},
  paywall: {},
  voice: {}
}
```

Recommended first conversion order:

1. `guide` - centralized and low risk.
2. `nav`, `projects`, `common`, `buttons`, `errors` - shared foundations.
3. `applications` and `workspace` - largest workflow, most visible.
4. `today` - depends on application/workspace terminology.
5. `interview`, `learning`, `tools`, `settings`, `notes`, `paywall`, `voice`.
6. Move onboarding from local copy objects into the shared dictionary.

## Phase 3 Glossary

These terms should be locked before final translation.

| English term | Meaning | Translation rule |
| --- | --- | --- |
| Application | A job application or role card. | Translate naturally. Avoid confusing it with software apps where possible. |
| Workspace | One role's working area: JD, research, notes, prep, follow-up. | Translate as a work area/workspace if natural. Keep "Workspace" only where local users understand it better. |
| Project | A separate job-search container. | Translate naturally. It is bigger than one application. |
| JD | Job description. | Keep `JD` if the market understands it, otherwise translate as "job description" in UI copy. |
| Prep | Interview/job preparation. | Translate as preparation, not as "prep school" or informal slang. |
| JobSensei | Product name. | Never translate. |
| Sensei | Supportive coaching mode. | Usually keep unchanged. |
| Drill | Strict/direct coaching mode. | Usually keep unchanged, with localized explanation if needed. |
| STAR | Interview answer framework. | Keep `STAR`; translate the expansion only where helpful. |
| ATS | Applicant Tracking System. | Keep `ATS`; translate the expansion only where helpful. |
| CV | Resume/CV document. | Keep `CV` where natural; use local resume term where better. |
| AI | Artificial intelligence. | Keep `AI` unless the language strongly prefers its local abbreviation. |
| Mock interview | Practice interview simulation. | Translate naturally. Avoid wording that sounds like a fake/invalid interview. |
| Follow-up | Post-application or post-interview follow-up action. | Translate as a professional follow-up/reminder, not social following. |
| Offer | Job offer stage. | Translate as employment offer, not a discount/promotion. |

## Tone Rules

- Prefer clear product language over literal translation.
- Use formal address where the language usually expects it in professional software:
  - Russian: formal `Вы`.
  - Bulgarian: formal `Вие`.
  - Spanish: likely neutral/formal enough for Spain, avoid overly casual Latin American phrasing.
  - German: formal `Sie`.
  - French: formal `vous`.
  - Italian: professional neutral; use formal where direct address appears.
  - Polish: professional neutral; use `Pan/Pani` only where direct personal address is unavoidable.
- Keep UI concise. If a translation becomes long, shorten the source-level key for that language rather than shrinking fonts.

## Phase 4 Translation Order

1. English source dictionary.
2. Russian.
3. Bulgarian.
4. Spanish (Spain).
5. Portuguese (Brazil), because browser voice currently works better with `pt-BR`.
6. German.
7. French.
8. Italian.
9. Polish.

## Phase 5 UI QA Checklist

For each language, inspect:

- Top bar language selector.
- Desktop sidebar.
- Mobile bottom navigation and `...` menu.
- Onboarding wizard.
- Today page and guide popover.
- Applications add flow.
- Application workspace tabs.
- Research notes and company notes.
- Interview simulator setup and session controls.
- Learning tutor, quiz, history, notes.
- Prep tools hub and individual tools.
- Settings, plan/AI access, resume upload, project data.
- Paywall/access modal.
- Voice bar states and microphone errors.

## Implementation Rules

- No new inline user-facing English after localization starts.
- Every new UI string gets a key immediately.
- Prefer `t('area.key')` for simple strings.
- Use interpolation for dynamic values:

```jsx
t('applications.researchWithAi', { company: newApp.company })
```

- Avoid building sentences from fragments when grammar changes by language.
- Keep option/status values separate from display labels when they are stored in project data.
- Do not translate internal stored enums directly unless there is a mapping layer:
  - `Researching`
  - `Applied`
  - `Screening`
  - `Interviewing`
  - `Awaiting`
  - `Offer`
  - `Rejected`

## First Target

Start with `TopBar.jsx` guide strings and guided-tour strings.

Why:

- Most guide strings are already centralized.
- The area is visible in every section.
- It gives us a clean pattern for converting arrays, titles, descriptions, and dynamic text before touching the larger workflows.

After that, convert shared `common`, `buttons`, `errors`, `nav`, and `projects`.

