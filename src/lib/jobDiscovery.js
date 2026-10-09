export function jobIdentity(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com')) {
      const id = url.pathname.match(/^\/jobs\/view\/(?:[^/]*-)?(\d+)\/?$/)?.[1]
      return id ? `linkedin:${id}` : null
    }
    if (['boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co'].includes(url.hostname) && url.pathname.split('/').filter(Boolean).length >= 2) return `${url.hostname}${url.pathname.replace(/\/$/, '')}`
  } catch { /* Invalid or unsupported source. */ }
  return null
}

export function shortlist(results, applications, activity, keywords, hideViewed = false, location = '') {
  const saved = new Set(applications.map(app => jobIdentity(app.jdUrl)).filter(Boolean))
  const terms = keywords.toLocaleLowerCase().split(/[\s,]+/).filter(term => term.length > 2)
  const seen = new Set()
  return results.filter(job => {
    if (!job.id || !matchesDiscovery(job, keywords, location) || seen.has(job.id) || saved.has(job.id) || activity[job.id]?.dismissed || (hideViewed && activity[job.id]?.viewed)) return false
    seen.add(job.id); return true
  }).map(job => ({ ...job, matched: [...new Set(terms.filter(term => `${job.title} ${job.snippet}`.toLocaleLowerCase().includes(term)))] }))
    .sort((a, b) => b.matched.length - a.matched.length).slice(0, 10)
}

const words = text => String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
const normalizeRole = text => String(text || '').toLowerCase()
  .replace(/anti[ -]money[ -]laundering/g, 'aml')
  .replace(/know[ -]your[ -]customer/g, 'kyc')
  .replace(/investigations?|investigators?|investigating/g, 'investigation')
  .replace(/analysts?|analytics/g, 'analyst')
  .replace(/compliance officer/g, 'compliance')

export function isDiscoveryExpired(job) {
  return /\b(no longer accepting applications|position (?:has been |is )?filled|job (?:has )?expired|vacancy (?:is )?closed)\b/i.test(`${job.title} ${job.snippet}`)
}

export function withinDiscoveryRecency(job, recency, now = Date.now()) {
  if (!recency) return true
  const days = { day: 1, week: 7, month: 31 }[recency]
  const dated = Date.parse(job.postedAt || job.sourceDate)
  // Unknown dates are not advertised as recent matches.
  return Number.isFinite(dated) && dated <= now && dated >= now - days * 86400000
}
export function matchesDiscovery(job, keywords, location = '') {
  // Related-job recommendations in search excerpts must not establish role fit.
  if (isDiscoveryExpired(job)) return false
  const title = words(normalizeRole(discoveryDraft(job).role))
  const alternatives = keywords.split(',').map(term => words(normalizeRole(term))).filter(tokens => tokens.length)
  const matchWord = (token, candidates) => candidates.some(word => word === token || word === `${token}s` || `${word}s` === token)
  if (!alternatives.some(tokens => tokens.every(token => matchWord(token, title)))) return false
  if (!location.trim()) return true
  const preferred = words(location).filter(word => !['or', 'and', 'remote', 'hybrid', 'onsite', 'in'].includes(word))
  const explicit = job.title.match(/\bin\s+([^|.…]+)$/i)?.[1]
  const remoteAllowed = /\bremote\b/i.test(location)
  if (explicit && preferred.length && !preferred.some(word => matchWord(word, words(explicit))) && !(remoteAllowed && /\bremote\b/i.test(explicit))) return false
  const evidence = words(`${job.title} ${job.snippet}`)
  return preferred.some(word => matchWord(word, evidence)) || (remoteAllowed && /\bremote\b/i.test(`${job.title} ${job.snippet}`)) || !preferred.length
}

export const discoverySignature = preferences => JSON.stringify({ ...preferences, keywords: preferences.keywords.trim().toLowerCase().replace(/\s+/g, ' '), location: preferences.location.trim().toLowerCase().replace(/\s+/g, ' ') })

export function discoveryDraft(job) {
  let role = job.title.replace(/\s*\|\s*LinkedIn.*$/i, '').trim()
  let company = job.company || ''
  const hiring = role.match(/^(.+?)\s+hiring\s+(.+?)(?:\s+in\s+.+)?$/i)
  const at = role.match(/^(.+?)\s+at\s+(.+)$/i)
  const dash = role.match(/^(.+?)\s+-\s+([\p{L}\p{N}.&' ]{2,60})$/u)
  if (hiring) { company ||= hiring[1]; role = hiring[2] }
  else if (at) { company ||= at[2]; role = at[1] }
  else if (dash && dash[2] === dash[2].toUpperCase()) { company ||= dash[2]; role = dash[1] }
  return { company, role, jdUrl: job.url, jdText: '', notes: `Search excerpt (not the full job description; confirm company and role):\n${job.snippet}` }
}

export function discoveryQuery(keywords, location, source) {
  const roles = keywords.split(',').map(term => term.trim()).filter(Boolean).slice(0, 8)
    .flatMap(term => /investigations?/i.test(term)
      ? [term, term.replace(/investigations?/i, 'investigator')]
      : /^aml$/i.test(term) ? [term, 'anti money laundering'] : [term])
  const terms = roles.length > 1 ? `(${[...new Set(roles)].map(term => `"${term.replace(/"/g, '')}"`).join(' OR ')})` : roles[0] || keywords.trim()
  return `${source === 'linkedin' ? 'site:linkedin.com/jobs/view/ ' : ''}${terms} ${location.trim()} job vacancy`
}

export function discoveryDate(job) {
  if (job.postedAt && Number.isFinite(Date.parse(job.postedAt))) return `Posted ${new Date(job.postedAt).toLocaleDateString()}`
  if (job.sourceDate && Number.isFinite(Date.parse(job.sourceDate))) return `Source page dated ${new Date(job.sourceDate).toLocaleDateString()} · ${job.id?.startsWith('linkedin:') || !job.id ? 'LinkedIn posting date unconfirmed' : 'Posting date unconfirmed'}`
  return 'Posting date unavailable'
}
