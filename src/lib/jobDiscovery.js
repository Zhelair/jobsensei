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

export function shortlist(results, applications, activity, keywords, hideViewed = false) {
  const saved = new Set(applications.map(app => jobIdentity(app.jdUrl)).filter(Boolean))
  const terms = keywords.toLocaleLowerCase().split(/[\s,]+/).filter(term => term.length > 2)
  const seen = new Set()
  return results.filter(job => {
    if (!job.id || seen.has(job.id) || saved.has(job.id) || activity[job.id]?.dismissed || (hideViewed && activity[job.id]?.viewed)) return false
    seen.add(job.id); return true
  }).map(job => ({ ...job, matched: [...new Set(terms.filter(term => `${job.title} ${job.snippet}`.toLocaleLowerCase().includes(term)))] }))
    .sort((a, b) => b.matched.length - a.matched.length).slice(0, 10)
}

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
  const terms = roles.length > 1 ? `(${roles.map(term => `"${term.replace(/"/g, '')}"`).join(' OR ')})` : keywords.trim()
  return `${source === 'linkedin' ? 'site:linkedin.com/jobs/view/ ' : ''}${terms} ${location.trim()} job vacancy`
}

export function discoveryDate(job) {
  if (job.postedAt && Number.isFinite(Date.parse(job.postedAt))) return `Posted ${new Date(job.postedAt).toLocaleDateString()}`
  if (job.sourceDate && Number.isFinite(Date.parse(job.sourceDate))) return `Source page dated ${new Date(job.sourceDate).toLocaleDateString()} · LinkedIn posting date unconfirmed`
  return 'Posting date unavailable'
}
