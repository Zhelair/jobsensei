import { authenticateSupabaseUser } from './_lib/authBridge.js'
import { jobIdentity, discoveryQueries, matchesDiscovery, withinDiscoveryRecency } from '../src/lib/jobDiscovery.js'
import { verifyBoardListing } from './_lib/jobBoards.js'
import { reserveDiscovery } from './_lib/discoveryBudget.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { keywords, location = '', source = 'linkedin', recency = '' } = req.body || {}
  if (typeof keywords !== 'string' || !keywords.trim() || keywords.length > 300 || typeof location !== 'string' || location.length > 100 || !['linkedin', 'careers', 'all'].includes(source) || !['', 'day', 'week', 'month'].includes(recency)) return res.status(400).json({ error: 'Invalid search preferences' })
  const { user } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to find jobs.' })
  if (!process.env.TAVILY_API_KEY) return res.status(503).json({ error: 'Job search is not configured yet.' })
  let reservation
  try {
    reservation = await reserveDiscovery(user.id, { keywords: keywords.trim().toLowerCase().replace(/\s+/g, ' '), location: location.trim().toLowerCase(), source, recency, version: 3 })
    if (reservation.status === 'cached') return res.status(200).json({ ...reservation.result, cached: true })
    if (reservation.status !== 'reserved') return res.status(reservation.status === 'account_unavailable' ? 403 : 429).json({ error: reservation.status === 'busy' ? 'This search is already running. Try again shortly.' : reservation.status === 'account_unavailable' ? 'Your account is unavailable for live search.' : 'Live-search safety limit reached (20 per hour or 100 per day). Your saved jobs remain available.' })
    const queries = discoveryQueries(keywords, location, source)
    const responses = await Promise.allSettled(queries.map(query => fetch('https://api.tavily.com/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: 'basic', auto_parameters: false, max_results: 20, include_answer: false, include_published_date: true, include_raw_content: false, include_domains: source === 'linkedin' ? ['linkedin.com'] : source === 'careers' ? ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co'] : ['linkedin.com', 'boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co'], ...(recency ? { time_range: recency } : {}) }),
      signal: AbortSignal.timeout(15000),
    })))
    const successful = responses.filter(r => r.status === 'fulfilled' && r.value.ok).map(r => r.value)
    const failed = responses.find(r => r.status === 'fulfilled' && !r.value.ok)?.value
    if (!successful.length) return res.status(503).json({ error: [432, 433].includes(failed?.status) ? 'Monthly job-search allowance exhausted. Live search will resume when the provider allowance resets; your saved jobs remain available.' : failed?.status === 429 ? 'The search provider is temporarily busy. Please try again shortly.' : 'Web search is unavailable. Please try again later.' })
    const payloads = await Promise.all(successful.map(r => r.json()))
    const results = payloads.flatMap(data => Array.isArray(data.results) ? data.results.slice(0, 20) : []).map(result => ({ id: jobIdentity(result.url), url: result.url, title: String(result.title || 'Job listing').slice(0, 300), sourceDate: typeof result.published_date === 'string' ? result.published_date : null, snippet: String(result.content || '').slice(0, 1600), availability: 'unconfirmed' })).filter(job => job.id)
    const candidates = [...new Map(results.filter(job => matchesDiscovery(job, keywords, location)).map(job => [job.id, job])).values()]
    const verified = source !== 'linkedin' ? [...await Promise.all(candidates.slice(0, 12).map(verifyBoardListing)), ...candidates.slice(12)] : candidates
    const unique = verified.filter(job => job && matchesDiscovery(job, keywords, location) && withinDiscoveryRecency(job, recency))
    const result = { results: unique, checkedAt: new Date().toISOString(), dateFilterApplied: Boolean(recency), undatedExcluded: recency ? verified.filter(job => job && !Number.isFinite(Date.parse(job.postedAt || job.sourceDate))).length : 0, partial: successful.length < responses.length, queryCount: queries.length }
    await reservation.finish(result)
    reservation = null
    return res.status(200).json(result)
  } catch { return res.status(503).json({ error: 'Search could not finish. Please try again later.' }) }
  finally { if (reservation?.status === 'reserved') await reservation.finish().catch(() => {}) }
}
