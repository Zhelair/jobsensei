---
name: code-review
description: Performs comprehensive code review for quality, security, and performance
enabled: true
auto_trigger: false
---

# Code Review Skill

## When to Use
Ask me: "Review this code" or "/code-review <file>"

## What I Check

### Code Quality
- [ ] Follows naming conventions (from CLAUDE.md)
- [ ] No code duplication
- [ ] Functions under 300 lines
- [ ] Clear variable names
- [ ] Comments on complex logic

### Performance
- [ ] Unnecessary re-renders (React)
- [ ] N+1 query problems
- [ ] Large bundle size impacts
- [ ] Memory leaks
- [ ] Inefficient loops

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection protection (if applicable)
- [ ] XSS protection (if web)
- [ ] No exposing sensitive data

### Testing
- [ ] Unit tests present
- [ ] Edge cases covered
- [ ] Mock external dependencies
- [ ] Test naming clear

### TypeScript (if used)
- [ ] Proper types (not `any`)
- [ ] Interfaces defined
- [ ] Type-safe operations

## Output
I provide:
1. **Summary** — Overall quality score
2. **Issues** — Critical, Warning, Suggestion
3. **Improvements** — Specific code changes
4. **Praise** — What's working well

## Example
```
You: "Review the JobCard component"
Me: [Analyzes JobCard.tsx]
    Issues found: 2
    Warnings: 3
    Good practices: 5
    Suggestions: [specific improvements]
```

## Notes
- Be specific about what to review
- I use your CLAUDE.md standards
- No shame in feedback—iteration makes great code
