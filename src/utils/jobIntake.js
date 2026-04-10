import { generateId } from './helpers'

const COMMON_PATH_WORDS = new Set([
  'job',
  'jobs',
  'view',
  'position',
  'positions',
  'posting',
  'postings',
  'career',
  'careers',
  'openings',
  'opening',
  'apply',
  'application',
  'remote',
  'hybrid',
  'office',
  'team',
  'department',
  'departments',
  'requisition',
  'req',
  'details',
  'opportunity',
  'opportunities',
])

function cleanToken(token) {
  return token
    .replace(/\.[a-z]{2,4}$/i, '')
    .replace(/[^a-zA-Z0-9&/+]/g, '')
    .trim()
}

function titleize(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      if (word.length <= 3 && word === word.toUpperCase()) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function normalizeApplicationUrl(input) {
  const trimmed = (input || '').trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProtocol).toString()
  } catch {
    return null
  }
}

export function guessApplicationFromUrl(inputUrl) {
  const normalized = normalizeApplicationUrl(inputUrl)
  if (!normalized) return null

  const url = new URL(normalized)
  const hostname = url.hostname.replace(/^www\./i, '')
  const segments = url.pathname
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)

  let company = ''
  let role = ''

  if (hostname.endsWith('greenhouse.io')) {
    company = titleize(hostname.split('.')[0].replace(/[-_]+/g, ' '))
  } else if (hostname.endsWith('lever.co')) {
    const firstSegment = segments[0]
    if (firstSegment && firstSegment.toLowerCase() !== 'jobs') {
      company = titleize(firstSegment.replace(/[-_]+/g, ' '))
    }
  } else if (hostname.endsWith('workable.com')) {
    const firstSegment = segments[0]
    if (firstSegment && firstSegment.toLowerCase() !== 'jobs') {
      company = titleize(firstSegment.replace(/[-_]+/g, ' '))
    }
  }

  const meaningfulSegments = segments.filter(segment => {
    const lowered = segment.toLowerCase()
    if (!/[a-z]/i.test(lowered)) return false
    if (/^\d+$/.test(lowered)) return false
    return !COMMON_PATH_WORDS.has(lowered)
  })

  const roleSegment = [...meaningfulSegments]
    .reverse()
    .find(segment => /[a-z]/i.test(segment) && segment.includes('-'))

  if (roleSegment) {
    const words = roleSegment
      .split(/[-_]+/)
      .map(cleanToken)
      .filter(Boolean)
      .filter(word => !COMMON_PATH_WORDS.has(word.toLowerCase()))
    if (words.length > 1) {
      role = titleize(words.join(' '))
    }
  }

  return {
    id: generateId(),
    url: normalized,
    company,
    role,
    stage: 'Researching',
  }
}

export function parseBulkApplicationUrls(rawText, limit = 5) {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  const deduped = []
  const seen = new Set()

  lines.forEach(line => {
    const normalized = normalizeApplicationUrl(line)
    const key = normalized || line
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(line)
    }
  })

  const limited = deduped.slice(0, limit)
  const entries = []
  const invalid = []

  limited.forEach(line => {
    const guessed = guessApplicationFromUrl(line)
    if (guessed) entries.push(guessed)
    else invalid.push(line)
  })

  return {
    entries,
    invalid,
    ignoredCount: Math.max(0, deduped.length - limit),
  }
}

export function makeTrackerApplication(fields) {
  return {
    id: generateId(),
    company: (fields.company || '').trim(),
    role: (fields.role || '').trim(),
    stage: fields.stage || 'Researching',
    jdUrl: (fields.jdUrl || '').trim(),
    jdText: (fields.jdText || '').trim(),
    date: new Date().toISOString(),
    stageUpdatedAt: new Date().toISOString(),
  }
}
