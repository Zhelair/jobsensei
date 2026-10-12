# Reference design revision — 13 October 2026

## Implemented

- Rebuilt Home around the supplied Dark and Daylight references: photographic Dark hero, faithful high-resolution reconstructions of the supplied Daylight illustrations, serif Daylight heading, coral buttons, compact three-step explanation and pricing near the hero. Only the active theme's hero artwork is loaded; responsive picture sources select the mobile Daylight illustration.
- Home is first in both desktop and mobile navigation. New visitors can use Today and other navigation immediately; Home no longer overrides every section until Explore is pressed. The initial URL and selected section remain consistent. Explicit sign-in and profile onboarding flows remain available.
- Restored Home's Guide with Home-specific copy.
- Home, Today, Account, Settings, application workspace and standalone gap analysis use available desktop width. Modal/dialog widths remain bounded.
- Today now has a compact active-role/progress panel, three real metrics, next action, recent activity and preparation links. Counts come from the project, not mockup numbers.
- The application workspace has a step navigator and selected preparation panel, progress bar, optional role context and advanced tools. Existing Kanban columns, stage changes, jobs and import/export behavior are retained.
- Account has a header and section navigation, clearer plan/upgrade grouping, resume/profile and device cards. The inactive Pro preview no longer repeats unavailable balances or dates. Settings removes duplicated Appearance controls and groups voice, data, extension and BYOK across the available space.
- Public examples are responsive authored UI rather than old audit screenshots. They contain a clearly fictional Maya Petrova CV, Harbour Payments role preparation, company questions, interview evidence, SQL lesson and two fictional offer comparisons. Visitor data is never used in these examples.
- Existing Visuals provider, preference, effects and toggles remain intact. Mobile chat focus behavior is retained.

## Discover diagnosis and changes

The previous search combined location alternatives into one phrase, required known dates under recency filters, and capped the client shortlist at ten. It searches indexed public vacancy pages, so it cannot reproduce LinkedIn's complete internal search.

- Default new searches to Any time and all supported sources. Existing saved filter choices remain unchanged.
- Search local and remote alternatives separately; split long role lists. At most three basic provider requests run per user search. This can spend up to three provider requests rather than one; the existing account search budget and provider allowance still apply.
- Keep successful query results if another query fails and show a partial-result notice.
- Retain up to sixty matching results, displaying twenty at a time with Show more.
- Explain when undated matches were excluded instead of claiming that no jobs exist.
- Offer related-title presets for compliance/AML/KYC and other roles, plus a properly encoded native LinkedIn search link.
- Preserve title-fit checks, unsupported-URL rejection, expired-listing checks, deduplication, saved/dismissed filtering and honest posting-date labels. Employer API verification is bounded to twelve candidates; remaining candidates remain explicitly unconfirmed rather than being dropped.
- Increment cache version so results from the former query strategy are not reused.

Tavily parameter reference: https://github.com/tavily-ai/tavily-power/blob/main/steering/api-reference.md

## Verification

- 112 tests pass, including new search-alternative, pagination, partial-failure and undated-count cases, plus existing billing/auth/Visuals regressions.
- Production build passes; existing bundle/PDF-tool warnings remain.
- Browser checks at 375, 390, 768, 1440 and 1920 pixels. Home is first in mobile navigation; Account and Settings have no document horizontal overflow at 375; tablet Settings fits at 768; Account fills the 1690px main area at a 1920px viewport.
- New visitor tested on a separate localhost origin: Today opens directly without Explore or sign-in.
- Home Guide opens with Home-specific content. Workspace selection opens the appropriate panel; mock-interview actions and context remain available.
- Populated tutor at 390 × 844 retains a 660px conversation area and hides global navigation only during the session.

## Release limits

This revision is local, not a production deployment. Live search results need a deployed environment with provider credentials. Physical phone keyboard/microphone testing remains separate from viewport emulation. New example and discovery copy is currently English; existing localized labels remain. The high-resolution illustrations are faithful reconstructions of the tiny supplied crops, not pixel-identical source vectors.
