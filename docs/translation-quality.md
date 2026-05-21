# Translation Quality Workflow

JobSensei already supports multiple UI languages, but good translation quality needs both automation and human review.

## What to do for every copy change

1. Write or update the English source copy first.
2. Add or update the localized strings in the same pass.
3. Run `npm run i18n:audit`.
4. Fix warnings for:
   - missing locale-specific keys
   - exact English leftovers
   - informal BG/RU tone where the app should sound formal
   - mixed Latin words that look like untranslated copy
5. For bigger wording changes, do one native-speaker review pass on the changed keys only.

## What the audit script checks

- Coverage of used UI keys across all supported dictionaries
- Exact matches with English in non-English locales
- Possible informal Russian and Bulgarian wording
- Suspicious Latin leftovers in localized strings

## What the audit does not replace

- Native tone judgment
- Context fit inside the actual UI
- Product terminology choices
- Grammar polish for longer paragraphs

## Recommended voice rules

- `ru`: use formal `Вы` voice in UI copy
- `bg`: use formal `Вие` voice in UI copy
- Keep product names like `JobSensei`, `AI`, `BYOK`, `JD`, and `CV` consistent across locales
- Avoid half-translated sentences where core verbs stay in English

## Best review pattern

- Use automation to catch the broad problems
- Use UI review to catch layout and readability
- Use native review for final tone and naturalness

That combination is the fastest way to keep all 9 languages aligned without manually rereading the whole app every time.
