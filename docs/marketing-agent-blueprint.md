# Marketing Agent Blueprint

This note captures the idea for a future standalone product inspired by the JobSensei launch workflow.

The short version: we want a local-first AI marketing copilot that helps a founder or small team turn rough product updates into channel-ready posts, preserve brand memory, and learn from what worked. It should feel like a practical operator, not a spam machine.

## Why This Should Be Its Own Repo

JobSensei is the first real use case, but the product idea is broader than job-search software.

Natural audiences:
- indie founders
- creators
- local businesses
- agencies
- solo consultants
- ecommerce stores
- community builders

The long-term product should not be framed as "auto-post everywhere." The stronger framing is:

`AI marketing copilot with memory, channel adaptation, and launch discipline.`

## Immediate Use Case For JobSensei

Use the tool first on JobSensei so it solves a real launch problem before becoming a separate startup.

Current launch tasks:
- personal Reddit founder-story post
- one subreddit post
- LinkedIn post
- giveaway / access offer wording
- screenshot and proof selection
- comment reply suggestions

## Core Product Thesis

Founders and creators often know their product well, but struggle to:
- turn messy notes into clear posts
- adapt one idea for multiple platforms
- keep a consistent tone
- remember which hooks and angles worked
- keep a record of launch experiments

The Marketing Agent should help with all of that.

## What The Agent Should Do

The agent should:
- store durable product memory
- store channel rules and tone preferences
- draft multiple post variants from one idea
- rewrite posts for Reddit, LinkedIn, X, Facebook, email, landing pages, and launch platforms
- suggest CTAs and giveaway angles
- keep a launch log
- track wins, misses, and lessons
- generate reply drafts for comments and DMs
- produce screenshot/video shot lists

The agent should not:
- mass-spam platforms
- hide risky automation behind vague UX
- auto-publish by default
- invent performance claims
- ignore subreddit or platform rules

## Suggested MVP

Start with a human-in-the-loop drafting product.

### MVP goals

- one workspace per product
- structured memory
- post drafting
- channel adaptation
- launch logging
- manual metrics entry

### First screens

1. Dashboard
2. Product Memory
3. Channels
4. Drafts
5. Launch Log
6. Offers / Giveaways
7. Assets / Proof

## Suggested Data Shape

Keep it simple and inspectable at first.

```text
workspace/
  brand.md
  product.md
  audience.md
  channels.md
  offers.md
  do-not-say.md
  launch-log.md
  wins.md
  drafts/
  assets/
```

Potential structured files:
- `campaigns.json`
- `posts.json`
- `metrics.json`
- `experiments.json`

## Good First Prompts

Useful tasks the agent should handle well:

- "Turn these messy founder notes into 3 Reddit post options."
- "Rewrite this as a LinkedIn post that sounds personal, not salesy."
- "Make this subreddit-safe and remove anything too promotional."
- "Suggest 5 hooks based on my real story."
- "Use my best-performing tone from last week."
- "Draft 10 comment replies for people asking for access."
- "Summarize this launch week and update memory with lessons learned."

## AI / Model Layer

DeepSeek is fine for the first version.

Good initial setup:
- DeepSeek for drafting and variations
- local memory files or lightweight database
- manual review before any publish action

Later the app can support:
- OpenAI
- Anthropic
- custom OpenAI-compatible endpoints

## Platform API Reality

A future version can connect to platform APIs, but this should not block the first release.

Important principle:

`Drafting, memory, and workflow are the real MVP. Posting integrations are phase two.`

As of April 28, 2026, there are official APIs for some of the target platforms, but access quality and approval friction vary by platform.

Likely phases:

### Phase 1

- no auto-posting
- manual copy/paste publishing
- manual metric entry

### Phase 2

- authenticated platform connections
- limited publishing where allowed
- fetch engagement stats where allowed

### Phase 3

- semi-agentic launch workflows
- experiment tracking
- recommendation engine based on prior results

## Product Guardrails

This matters a lot.

The product should be built around:
- truthful claims
- permission-aware integrations
- founder review before posting
- channel-specific etiquette
- memory updates only from approved facts

## JobSensei-Specific Seed Memory

The first workspace should remember:
- JobSensei helps people prepare for real job interviews
- strongest story angle is founder-used-it-for-a-real-interview
- key product strengths are interview simulation, Drill mode, CV/JD reading, learning system, STAR prep, job tracker
- privacy and local-first design are differentiators, but should be stated calmly
- Chrome extension is built and headed toward store publication, not oversold
- founder is open to gifting limited access for feedback

## Recommended Stack For The Separate Repo

Good first build:
- React or Next.js
- local file or lightweight DB-backed memory
- simple rich text + markdown editing
- JSON export
- provider abstraction for DeepSeek / OpenAI / Anthropic

If we want a quick "vibe-coded" first pass:
- Vite
- React
- local storage or file-backed draft memory
- a clean dashboard UI

## Build Order

1. Create standalone repo
2. Build workspace + memory model
3. Build post drafting UI
4. Add channel adaptation workflows
5. Add launch log and metrics memory
6. Add optional API integrations later

## Definition Of Success For V1

The first version is successful if it helps one founder:
- go from messy notes to good launch copy quickly
- keep a consistent tone
- remember what worked
- avoid wasting momentum during launches

If it does that well for JobSensei, it has a real shot as a separate product.
