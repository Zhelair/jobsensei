---
name: deploy-ready
description: Prepares project for deployment by creating summaries, checklists, and deployment artifacts
enabled: true
auto_trigger: false
---

# Deploy-Ready Skill

## When to Use
Ask me: "Make this deployment-ready" or "/deploy-ready"

## What I Do

### 1. Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Build succeeds without warnings
- [ ] Environment variables set
- [ ] No console errors in dev
- [ ] Git is clean (all changes committed)

### 2. Create Deployment Summary
I generate a file: `DEPLOYMENT_SUMMARY.md` with:
- Features added/changed
- Bug fixes
- Dependencies updated
- Breaking changes (if any)
- Testing coverage
- Deployment instructions

### 3. Verify Build
```bash
npm run build
npm test
```

### 4. Git Hygiene
- All changes committed
- Commit messages follow convention
- Branch ready for merge to main

### 5. Deployment Steps (for Vercel)
1. Push to main (auto-deploys)
2. Monitor Vercel logs
3. Test production URL
4. Rollback plan ready

## Output Files
- `DEPLOYMENT_SUMMARY.md` — Share with team/stakeholders
- `DEPLOYMENT_CHECKLIST.md` — Print or reference during deployment
- Deployment artifacts (if needed)

## Example Usage
```
You: "Make jobsensei deployment-ready for production"
Me: [Runs tests, creates summaries, verifies build, confirms ready]
```

## Notes
- I'll warn if anything is missing
- No deployment happens automatically
- Vercel handles actual deployment
- Rollback instructions included
