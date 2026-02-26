---
name: pre-commit-validation
description: Validates code before committing - runs linting, type checks, tests
enabled: false
trigger: pre-commit
---

# Pre-Commit Validation Hook

## Purpose
Runs automatically before you commit to catch issues early.

## What Gets Checked
1. **TypeScript Compilation**
   ```bash
   npm run type-check
   ```

2. **Linting**
   ```bash
   npm run lint
   ```

3. **Tests (if fast)**
   ```bash
   npm test -- --quick
   ```

4. **No Secrets**
   - Checks for API keys, tokens
   - Warns about .env exposure

## How to Enable
Add to `.git/hooks/pre-commit` or configure in your IDE.

## Actions
- ✅ **PASS**: Commit proceeds
- ⚠️ **WARN**: Shows warnings but allows commit
- ❌ **FAIL**: Blocks commit until fixed

## Example
```bash
$ git commit -m "feat: add job filtering"

[Hook] Running pre-commit checks...
✓ TypeScript OK
✓ Linting OK  
✓ Tests OK
✅ Ready to commit!
```

## Notes
- Only validates files being committed
- Can bypass with `git commit --no-verify` (not recommended!)
- Speeds up CI/CD by catching issues early
