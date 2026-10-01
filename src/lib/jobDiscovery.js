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
