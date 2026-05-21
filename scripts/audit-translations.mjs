import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const srcDir = path.join(projectRoot, 'src')
const languageContextPath = path.join(srcDir, 'context', 'LanguageContext.jsx')
const localizationPatchesPath = path.join(srcDir, 'context', 'localizationPatches.js')
const strictMode = process.argv.includes('--strict')

const DICTIONARY_LABELS = {
  en: 'English',
  ru: 'Russian',
  bg: 'Bulgarian',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  de: 'German',
}

const INFORMAL_PATTERNS = {
  ru: /\b(ты|твой|твоя|твоё|твоего|твоему|твоим|твоих|тебе|тебя|тобой|нажми|добавь|сохрани|вставь|используй|выбери|напиши|проверь)\b/iu,
  bg: /\b(ти|твой|твоя|твоят|твоето|твоята|твоите|теб|тебе|можеш|искаш|виждаш|натисни|избери|добави|запази|постави|пиши|свържи|ползвай|използвай)\b/iu,
}

const ALLOWED_LATIN_WORDS = new Set([
  'AI',
  'API',
  'ATS',
  'BYOK',
  'CV',
  'Chrome',
  'Claude',
  'Clear',
  'Cookie',
  'DeepSeek',
  'Drill',
  'English',
  'Excel',
  'Google',
  'JD',
  'JobSensei',
  'LinkedIn',
  'OpenAI',
  'PDF',
  'Policy',
  'Privacy',
  'Quiz',
  'Resume',
  'Resend',
  'Save',
  'Sensei',
  'Settings',
  'Storage',
  'Supabase',
  'Terms',
  'Test',
  'Unlock',
  'Vercel',
  'Visual',
  'workspace',
  'workflow',
  'follow',
  'feedback',
  'hosted',
  'monitoring',
  'analytics',
  'performance',
  'traffic',
])

function extractObjectLiteral(source, marker) {
  const markerIndex = source.indexOf(marker)
  if (markerIndex === -1) {
    throw new Error(`Could not find marker: ${marker}`)
  }

  const startIndex = source.indexOf('{', markerIndex)
  if (startIndex === -1) {
    throw new Error(`Could not find object start for marker: ${marker}`)
  }

  let depth = 0
  let inString = false
  let stringQuote = ''
  let escaped = false

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === stringQuote) {
        inString = false
        stringQuote = ''
      }
      continue
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true
      stringQuote = char
      continue
    }

    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(startIndex, i + 1)
      }
    }
  }

  throw new Error(`Could not find object end for marker: ${marker}`)
}

function loadBaseTranslations() {
  const source = fs.readFileSync(languageContextPath, 'utf8')
  const objectLiteral = extractObjectLiteral(source, 'const TRANSLATIONS =')
  return vm.runInNewContext(`(${objectLiteral})`)
}

async function loadLocalizationPatches() {
  const moduleUrl = pathToFileURL(localizationPatchesPath).href
  const mod = await import(moduleUrl)
  return mod.default
}

function getAllSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath))
      continue
    }
    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

function collectUsedTranslationKeys() {
  const files = getAllSourceFiles(srcDir)
  const keyRegex = /\bt\(\s*['"`]([^'"`]+)['"`]/g
  const keys = new Set()

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    let match = keyRegex.exec(source)
    while (match) {
      keys.add(match[1])
      match = keyRegex.exec(source)
    }
  }

  return [...keys].sort()
}

function ownValueForLocale(baseTranslations, localizationPatches, locale, key) {
  if (Object.prototype.hasOwnProperty.call(localizationPatches[locale] || {}, key)) {
    return localizationPatches[locale][key]
  }
  if (Object.prototype.hasOwnProperty.call(baseTranslations[locale] || {}, key)) {
    return baseTranslations[locale][key]
  }
  return undefined
}

function resolvedValueForLocale(baseTranslations, localizationPatches, locale, key) {
  return ownValueForLocale(baseTranslations, localizationPatches, locale, key)
    ?? ownValueForLocale(baseTranslations, localizationPatches, 'en', key)
    ?? key
}

function findSuspiciousLatinWords(value) {
  const words = value.match(/[A-Za-z][A-Za-z'-]{2,}/g) || []
  return words.filter(word => !ALLOWED_LATIN_WORDS.has(word))
}

function buildReport(baseTranslations, localizationPatches, usedKeys) {
  const locales = Object.keys(DICTIONARY_LABELS)
  const report = []

  for (const locale of locales) {
    const localeLabel = DICTIONARY_LABELS[locale]
    const missingKeys = []
    const englishMatches = []
    const informalMatches = []
    const latinLeftovers = []

    for (const key of usedKeys) {
      const ownValue = ownValueForLocale(baseTranslations, localizationPatches, locale, key)
      const resolvedValue = resolvedValueForLocale(baseTranslations, localizationPatches, locale, key)
      const englishValue = resolvedValueForLocale(baseTranslations, localizationPatches, 'en', key)

      if (locale !== 'en' && ownValue === undefined) {
        missingKeys.push(key)
      }

      if (locale !== 'en' && ownValue !== undefined && ownValue === englishValue) {
        englishMatches.push({ key, value: ownValue })
      }

      if (INFORMAL_PATTERNS[locale] && INFORMAL_PATTERNS[locale].test(resolvedValue)) {
        informalMatches.push({ key, value: resolvedValue })
      }

      if (locale !== 'en') {
        const suspiciousWords = findSuspiciousLatinWords(resolvedValue)
        if (suspiciousWords.length >= 2) {
          latinLeftovers.push({ key, value: resolvedValue, words: suspiciousWords.slice(0, 5) })
        }
      }
    }

    report.push({
      locale,
      localeLabel,
      usedKeys: usedKeys.length,
      ownCoverage: usedKeys.length - missingKeys.length,
      missingKeys,
      englishMatches,
      informalMatches,
      latinLeftovers,
    })
  }

  return report
}

function printSection(title) {
  process.stdout.write(`\n${title}\n`)
}

function printList(items, formatter, limit = 8) {
  const sample = items.slice(0, limit)
  for (const item of sample) {
    process.stdout.write(`  - ${formatter(item)}\n`)
  }
  if (items.length > limit) {
    process.stdout.write(`  - ... and ${items.length - limit} more\n`)
  }
}

function summarizeKeyNamespaces(keys) {
  const counts = new Map()

  for (const key of keys) {
    const parts = key.split('.')
    const bucket = parts.slice(0, Math.min(2, parts.length)).join('.')
    counts.set(bucket, (counts.get(bucket) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
}

async function main() {
  const baseTranslations = loadBaseTranslations()
  const localizationPatches = await loadLocalizationPatches()
  const usedKeys = collectUsedTranslationKeys()
  const report = buildReport(baseTranslations, localizationPatches, usedKeys)

  process.stdout.write(`Translation audit for ${usedKeys.length} UI keys across ${report.length} locales.\n`)

  let hasIssues = false

  for (const localeReport of report) {
    const coveragePercent = Math.round((localeReport.ownCoverage / localeReport.usedKeys) * 100)
    process.stdout.write(
      `\n[${localeReport.locale}] ${localeReport.localeLabel}: ${localeReport.ownCoverage}/${localeReport.usedKeys} own keys (${coveragePercent}%)\n`,
    )

    if (localeReport.missingKeys.length) {
      hasIssues = true
      const namespaceSummary = summarizeKeyNamespaces(localeReport.missingKeys)
      printSection('Top missing areas')
      printList(namespaceSummary, ([bucket, count]) => `${bucket}: ${count}`)
      printSection('Missing locale-specific keys')
      printList(localeReport.missingKeys, key => key)
    }

    if (localeReport.englishMatches.length) {
      hasIssues = true
      printSection('Exact English matches')
      printList(localeReport.englishMatches, item => `${item.key}: ${item.value}`)
    }

    if (localeReport.informalMatches.length) {
      hasIssues = true
      printSection('Potential informal tone')
      printList(localeReport.informalMatches, item => `${item.key}: ${item.value}`)
    }

    if (localeReport.latinLeftovers.length) {
      hasIssues = true
      printSection('Potential untranslated Latin leftovers')
      printList(localeReport.latinLeftovers, item => `${item.key}: [${item.words.join(', ')}] ${item.value}`)
    }
  }

  if (!hasIssues) {
    process.stdout.write('\nNo obvious translation issues found.\n')
  } else if (!strictMode) {
    process.stdout.write('\nAudit finished with warnings. Use --strict to fail CI on issues.\n')
  }

  if (strictMode && hasIssues) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
