# JobSensei homepage design exploration — 12 October 2026

Status: planning and visual concepts only. Do not implement these concepts as an approved redesign yet.

## Recommendation

Keep the workspace themes, identity, functionality and sidebar structure. Give the public/product overview a dedicated Home route and stronger product-led presentation. Today stays the returning user's next-action dashboard. The dark concept is the lowest-risk first direction; warm editorial is an alternative presentation, not a required global theme change.

## Evidence and audit scope

Reviewed WelcomePage.jsx, ProductStory.jsx, Sidebar.jsx, AppContext.jsx, App.jsx, the provided sidebar screenshot, prior live Account/Applications/Discover/payment walkthroughs, and current Linear and Teal homepages. This is a targeted UX audit, not an exhaustive responsive/accessibility certification of every tool.

- Welcome is selected by onboarding state while the location remains #today. The same location presents different screens and the product tour becomes hard to revisit. Add a persistent #home route independent of profile onboarding; preserve #today for daily work.
- The welcome access block exposes Free, Pro, BYOK and Google as competing decisions. Lead with Start free, open one accessible sign-in step with Google/email, and make Pro an upgrade decision. BYOK is a secondary path in Settings.
- ProductStory gives each desktop chapter at least 24rem of height, across seven chapters. That explains much of the sparse scroll. Replace with a compact three-stage story and selectable demonstration tabs. Keep the full tour available on demand.
- Dense whole-app screenshots lose legibility when nested in the app shell. Show one application's progress and one meaningful result at a time. Label illustrative results and use fictional data.
- The sidebar's empty area is not inherently a defect. Preserve its useful three main work destinations; avoid filling it with decorative content. Add Home as a quiet persistent entry; brand logo also links to Home.
- Account shows credits, devices, resume and billing at similar visual weight. A later focused polish can prioritize plan/billing, place resume in a secondary section, and keep errors beside their trigger.
- Public price copy must agree with checkout: EUR 8 base price, applicable tax disclosure. Free allowance is 465 credits (15 hosted requests at 31 credits). Pro is 25,110 credits (810 requests). Do not promise unlimited hosted AI.
- Local-first disclosure must be clear: sign-in restores account access/credits, not automatic workspace sync. Keep Export/Import discoverable.
- Discover dates should remain explicitly source dates when actual posting dates are unknown. A visual redesign must not imply verified freshness or exhaustive LinkedIn coverage.

## Navigation behavior

First-time visit to the site: Home overview, then explicit Start free or Explore workspace. Returning visits: last valid workspace location or Today. Home always works from sidebar/logo and browser Back. Visiting Home does not reset setup, display a profile wizard, sign out, or overwrite stored data. Signed-in Home replaces Start free with Open workspace. The marketing view uses a compact top header; the workspace retains its sidebar. A home route must support refresh/deep links and translation.

Proposed sidebar order: Home, Today, Applications, Learning; project switcher, Account and Settings stay at the bottom. Mobile should preserve concise primary navigation with Home reachable through logo/menu rather than cramming every route into a bottom bar.

## Page structure

1. Compact header: logo, How it works, Pricing, Sign in/Open workspace.
2. Hero: Your next role. A clearer plan. Supporting sentence: Track applications, prepare your story, and practice for the interview. Primary Start free; secondary See how it works.
3. One large readable product preview: a fictional Fraud Analyst application, its research/preparation/practice progression, and a visible next action. No screenshot inside another screenshot.
4. Three-stage workflow: Find your focus; Prepare with evidence; Practice with confidence. Explain benefits through concrete actions.
5. Selectable product demonstration: applications, research/resume, interview, learning/offers. Real screenshots or short captioned clips; no autoplay audio.
6. Trust facts: workspace stays in this browser, Google/email access, exportable data, hosted AI or own key. No invented social proof, success statistics, company logos or testimonials.
7. Two pricing choices Free / Pro, with tax disclosure and a secondary BYOK link. Billing stays in Account; BMAC stays in Feedback & support.
8. Compact FAQ and legal/footer links.

## Art directions

A — Refined dark (recommended): existing navy with restrained teal/lilac, high-contrast type, thin dividers, clearer screenshot frame, 8–12px functional corners, one softly lit visual accent. Preserve themes and animations; use reduced-motion alternatives.
B — Warm editorial: ivory, charcoal, muted terracotta, distinctive serif headline paired with readable sans body, split hero and calmer career-coaching voice. Test this for public Home; do not force it across the workspace.
C — Clear & approachable: white, indigo and restrained mint; concise headings, asymmetric cropped product preview, friendly onboarding emphasis. This is a more substantial visual departure.

Generated comparison board is an illustrative direction study, not a pixel-exact implementation or evidence that any feature exists beyond the current product.

## References reviewed

- https://linear.app — product-led hierarchy and clear interface demonstrations; original JobSensei content should retain its own identity.
- https://www.tealhq.com — career context, direct CTA and demo tabs; do not borrow their performance claims.
- https://www.raycast.com — additional reference for premium product presentation.
- https://www.framer.com/marketplace/templates/techify/ — candidate structure with hero, features and product demonstration.
- https://www.framer.com/marketplace/templates/probe/ — candidate landing-page structure.
- https://www.framer.com/marketplace/templates/orbitsaas/ — dark/warm-accent alternative; avoid importing unnecessary shader complexity.

Framer/Webflow listings are inspiration candidates. Check licenses before copying assets; rebuild the selected composition in the existing React/Vite app rather than migrating the product stack.

## Next review and implementation gates

Choose an art direction or a deliberate combination. Next create a larger desktop hero and 390px mobile mockup, approve content and route behavior, then implement Home and presentation components. Verify 390/768/1440 widths, keyboard flow, contrast, reduced motion, all supported language layouts, signed-in/out behavior, navigation history and Google/Paddle regression flows. No database or billing logic redesign is needed for this visual work.
