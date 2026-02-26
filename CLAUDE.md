# JobSensei - Claude Code Guidelines

## Project Overview
**JobSensei** is a job discovery and matching application. This file ensures Claude Code aligns with project standards, reduces token usage, and maintains consistency across sessions.

---

## Architecture & Core Patterns

### Stack
- **Frontend:** Next.js / React (check package.json for exact version)
- **Backend:** Node.js / API routes (or external API)
- **Database:** (Define here - PostgreSQL, MongoDB, Supabase, etc.)
- **Deployment:** Vercel (as seen in GitHub)
- **Auth:** (Define auth strategy if any)

### File Structure
```
jobsensei/
├── src/
│   ├── components/    # React components (lowercase, kebab-case)
│   ├── pages/         # Next.js pages
│   ├── lib/           # Utilities, helpers, API calls
│   ├── hooks/         # Custom React hooks
│   ├── styles/        # Global styles
│   └── types/         # TypeScript types
├── public/            # Static assets
├── .env.local         # Local environment variables
├── .claude/           # Claude Code configuration (skills, hooks)
└── CLAUDE.md          # This file
```

---

## Coding Standards

### TypeScript
- Always use `.ts` / `.tsx` files
- Define interfaces for all data structures in `src/types/`
- Export type definitions clearly
- Example:
  ```typescript
  interface Job {
    id: string;
    title: string;
    company: string;
    salary?: number;
  }
  ```

### React & Next.js
- Use functional components with hooks (no class components)
- Keep components under 300 lines—break into smaller pieces
- Use `next/link` for internal navigation
- Naming: `PascalCase` for components, `camelCase` for functions/variables
- One component per file (unless shared helpers)

### CSS / Styling
- Use Tailwind CSS for styling (if installed) or CSS Modules
- Global styles in `/styles/globals.css`
- Never inline large style objects—use separate files

### Naming Conventions
- Components: `PascalCase` (JobCard.tsx, FilterPanel.tsx)
- Functions: `camelCase` (fetchJobs, formatSalary)
- Constants: `UPPER_SNAKE_CASE` (MAX_RESULTS, API_BASE_URL)
- Files: lowercase, kebab-case (job-card.tsx, api-helper.ts)

---

## Token-Saving Rules

### ⚠️ Critical: Keep Context Lean
1. **No large copy-paste sessions** → I read actual files via Git
2. **Focus on logic, not boilerplate** → Show me the key lines
3. **Avoid pasting entire files** → Reference them by path instead
4. **Use `/read src/components/JobCard.tsx` command in Claude Code** → Don't paste here

### Commands to Use
- `/read <file>` — I read it directly, no token cost to chat
- `/grep <pattern>` — Search for patterns across codebase
- `/ls <dir>` — List directory structure
- `/git status` — Check what's changed
- `/git diff <file>` — Show changes in a file

### When to Start a New Session
- After major feature is complete (I'll create a summary)
- If conversation exceeds 30 back-and-forths
- When switching between totally different features
- After successful deployment

---

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests (if configured)
npm test
```

### Git Workflow
1. Create branch: `git checkout -b feature/feature-name`
2. Make changes
3. Commit with clear messages: `git commit -m "feat: add job filtering"`
4. Push and create PR: `git push origin feature/feature-name`
5. I can help create PRs via `/github-create-pr`

### Environment Variables
- Local: `.env.local` (never commit)
- Production: Set in Vercel dashboard
- Keep secrets out of logs and console

---

## Common Tasks & Shortcuts

### Adding a New Feature
**Ask me:** "Build a feature that [description]"
1. I analyze existing patterns
2. Create/modify files accordingly
3. Suggest testing approach
4. Create PR if needed

### Debugging
**Ask me:** "Debug [component/function] - [what's broken]"
- Include error message or expected vs. actual behavior
- I'll use `/read`, `/grep` to find root cause
- No need to paste entire error logs—just the essence

### Refactoring
**Ask me:** "Refactor [component] for [reason - performance/readability/etc]"
- I maintain the same API
- Preserve test coverage
- Update related files

### Testing
**Ask me:** "Write tests for [function/component]"
- I'll follow your testing framework
- Create comprehensive test cases
- Match existing test patterns

---

## Deployment

### Vercel
- Automatic deployment on push to main
- Preview URLs for all PRs
- Environment variables in Vercel dashboard
- Logs accessible via Vercel CLI

### Pre-Deployment Checklist
- [ ] Tests pass locally: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors/warnings
- [ ] Environment variables configured
- [ ] PR reviewed and approved

### Rollback
If deployment breaks production:
1. Revert latest commit: `git revert HEAD`
2. Push to main
3. Vercel auto-deploys
4. I can help investigate root cause

---

## Performance & Optimization

### Key Metrics
- Lighthouse score should be 80+
- Core Web Vitals within bounds
- API response time < 500ms

### Optimization Tips
- Use Next.js Image optimization
- Lazy-load heavy components
- Memoize expensive calculations
- Paginate large lists

---

## Common Questions & Answers

**Q: Do you have context from my last session?**
A: No—Git is my context. I read your actual files, not chat history. Start fresh each session!

**Q: Should I paste my whole component?**
A: No! Use `/read src/components/MyComponent.tsx` in Claude Code. Way cheaper.

**Q: How do I switch between features?**
A: New branch + new Claude session. Don't drag feature context across sessions.

**Q: What if I'm blocked?**
A: Tell me the exact error, what you tried, and what you expected. Include error stack trace.

---

## Notes for Claude Code Sessions

### Session Continuity
- Save important context in Git commits
- Use meaningful commit messages
- Push to GitHub at natural breakpoints
- Next session reads the latest code from Git

### When NOT to Use Claude
- Don't ask me to guess missing context—tell me or commit it
- Don't expect me to remember "what we did last time"—I read the code
- Don't paste 1000-line files—reference them
- Don't run expensive operations without asking

### Handoff Between Sessions
Create a summary commit:
```bash
git commit --allow-empty -m "
CHECKPOINT: [Feature] completed
Status: [What's done]
Next steps: [What to do next]
"
```

---

## Links & Resources
- GitHub Repo: https://github.com/Zhelair/jobsensei
- Live App: https://jobsensei.vercel.app/
- Claude Code Docs: https://code.claude.com/
- Support: Ask me anything!

---

## Last Updated
February 26, 2026

---

**Remember:** The goal is efficiency. Keep this lean, keep Git clean, start fresh sessions often. You'll save tokens and move faster. Let's build something great! 🚀
