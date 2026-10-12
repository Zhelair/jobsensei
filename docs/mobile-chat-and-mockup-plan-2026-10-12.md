# Mobile chat and mockup review

Planning only. No app UI implementation changes.

## Verified mobile chat findings

Live jobsensei.app at 390×844, fictional audit data:

- Learning message viewport: 417.5px tall, approximately 49% of screen height. Global header 77px, lesson header 117px, composer/help/save panel approximately 175px, bottom navigation approximately 58px.
- Interview message viewport: 549px tall, approximately 65% of screen height. It is less cramped than Learning but shares the same narrow composer and avatar gutter.
- Both input fields are only 214px wide. Two separate 40px voice/playback buttons plus send, gaps and outer padding consume much of the width.
- Learning's default composer is 40px high; interview placeholder wraps and produces a 60px composer. A 140-character unsent learning draft expanded toward the 160px input cap, displacing more messages. Draft was cleared without sending.
- Assistant messages lose width to outer padding, avatar and gutter. Text is displayed as raw Markdown rather than rendered headings, lists, code and tables.
- Interview opening response generated successfully on the fictional audit account; session ended without an answer. Native phone keyboard/microphone was not tested.

## Proposed shared chat focus layout

Applies to live Interview Simulator and Learning tutor, plus future conversational screens using ChatWindow/VoiceChatBar. Saved history is a reading view and should retain normal app navigation unless the user explicitly opens focus mode.

1. One compact session header, roughly 56px, with named Back, session title and More. Replace the global mobile header during a live session rather than stacking both.
2. Optional 28–32px context row with role/topic and progress. Expand Details to see JD, lesson description or settings. Keep context one tap away.
3. Transcript fills remaining space. Full-width assistant prose with 12–16px margins, no repeated avatar gutter on mobile. User turns stay distinct. Body text remains 16px with comfortable line height; do not solve density by shrinking text.
4. Composer normally one or two lines, with full-width writing area. Group replay/autoplay, Save to Notes and advanced controls in More or per-message actions. Keep microphone reachable and clearly show active recording/stop/discard states. Always-visible startup hints should disappear after the first message.
5. Collapse bottom app navigation while in mobile focus mode; Back returns to the source screen and preserves messages. When navigating away with an active recording or pending request, handle its state deliberately.
6. Keyboard open: composer tracks the visible viewport, transcript shrinks, no input under the keyboard or navigation overlay. Use dynamic viewport sizing and safe-area insets, then verify with real iOS Safari and Android Chrome. Desktop responsive emulation does not prove keyboard behavior.
7. Maintain one transcript scrolling container. Scroll to newest on own send; preserve reading position when looking at older messages and show New response affordance. Avoid forcing scroll for unrelated layout changes.
8. Render safe Markdown consistently. Tables and code scroll within themselves. Copy/save actions remain accessible with named controls and 44px targets.

Target at 390×844 without keyboard: approximately 640–680px for messages, depending on context and composer height. This is a design budget, not a measured implemented result. Learning could recover roughly 220–260px. Preserve keyboard focus, draft, voice preferences, history, cancellation and message persistence.

## Mockup set

Three theme boards: Dark, Daylight, Neon. Each shows Home, Today and application workspace in desktop and mobile compositions. A fourth board shows the mobile focus chat for interview and learning, with Daylight/Neon parity examples. These are illustrative raster concepts, not exact implementation screenshots. Final UI text, controls, accessibility and responsive behavior must be checked in a deterministic prototype before coding the product.

Shared page structure:

- Home: one hero action, evidence-based product preview, three workflow steps, compact accurate Free/Pro pricing, FAQ/legal and small BYOK alternative. Persistent Home distinct from Today.
- Today: active application, one useful next action, supporting stats and recent history.
- Workspace: six-step journey, selected next step dominant, completed steps reviewable/collapsible, context expandable, optional advanced tools.
- Theme parity: shared spacing, type, hierarchy and behavior; navy/teal Dark, warm ivory/coral/teal Daylight, restrained plum/magenta/violet Neon.

## Review criteria before implementation

- All three themes feel like JobSensei, not unrelated templates.
- Mobile is reflowed and readable, not a scaled desktop screenshot.
- Chat focus has a clear exit and accessible voice/save actions.
- No implication that workflow completion guarantees job readiness, or AI scores predict hiring.
- Pricing copy: €8/month plus applicable tax, 465 Free credits, 25,110 Pro credits, 31 credits per hosted request. No unlimited AI claims.
- Browser-local workspace disclosure remains visible at the appropriate entry points.
- Next step after visual review: a clickable responsive prototype, then small production changes with representative theme/mobile validation.

## Generated concept review notes

Preview artifact directory: C:/Users/niksa/.codex/generated_images/01a13062-ede3-7e51-81db-94713dcbd3b5.

- Mobile chat: exec-bc4a457e-597e-46bd-8f35-46a9df1cf721.png
- Dark corrected board: exec-8db44d51-c49a-4ca7-a8e5-cbfc1f8ec218.png
- Daylight corrected board: exec-658963c6-0726-40cc-a55b-e3407d7971e8.png
- Neon corrected board: exec-a3239e72-603c-4a27-8e4f-8ccb3c48a76e.png

Preferred composition: Dark board. Daylight and Neon are palette/composition studies, not exact theme-parity specifications. Neon still gives BYOK excessive card prominence; implement it as a small alternative link. Step numerals and sample metrics in raster boards are illustrative and must be normalized in the prototype. Keep established typography across themes rather than adopting the generated Daylight serif brand treatment.

Built-in image generation was used for preview-only boards. First-pass boards are superseded where pricing/workflow copy was incorrect. Corrected boards are visual references, not product requirements: raster generation can still add extra tabs, inconsistent step numerals, decorative imagery or unsupported metrics. The six steps, navigation, pricing and data behavior specified in these documents take precedence. Do not implement unrequested notifications, sharing/sync, timed-practice statistics or a new workflow merely because they appear in a concept image. Use real product imagery for the final homepage instead of stock laptop scenes or generic illustrations. Preserve JobSensei's established logo and type system when turning concepts into a prototype.
