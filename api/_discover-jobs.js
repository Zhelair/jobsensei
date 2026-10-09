import { authenticateSupabaseUser } from './_lib/authBridge.js'
import { jobIdentity, discoveryQuery, matchesDiscovery, withinDiscoveryRecency } from '../src/lib/jobDiscovery.js'
import { verifyBoardListing } from './_lib/jobBoards.js'
import { reserveDiscovery } from './_lib/discoveryBudget.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { keywords, location = '', source = 'linkedin', recency = '' } = req.body || {}
  if (typeof keywords !== 'string' || !keywords.trim() || keywords.length > 300 || typeof location !== 'string' || location.length > 100 || !['linkedin', 'careers'].includes(source) || !['', 'day', 'week', 'month'].includes(recency)) return res.status(400).json({ error: 'Invalid search preferences' })
  const { user } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to find jobs.' })
  if (!process.env.TAVILY_API_KEY) return res.status(503).json({ error: 'Job search is not configured yet.' })
  let reservation
  try {
    reservation = await reserveDiscovery(user.id, { keywords: keywords.trim().toLowerCase().replace(/\s+/g, ' '), location: location.trim().toLowerCase(), source, recency, version: 2 })
    if (reservation.status === 'cached') return res.status(200).json({ ...reservation.result, cached: true })
    if (reservation.status !== 'reserved') return res.status(reservation.status === 'account_unavailable' ? 403 : 429).json({ error: reservation.status === 'busy' ? 'This search is already running. Try again shortly.' : reservation.status === 'account_unavailable' ? 'Your account is unavailable for live search.' : 'Live-search safety limit reached (20 per hour or 100 per day). Your saved jobs remain available.' })
    const roleGroups = keywords.split(',').map(s => s.trim()).filter(Boolean)
    const queries = roleGroups.length > 3
      ? [roleGroups.slice(0, 3).join(', '), roleGroups.slice(3, 6).join(', '), roleGroups.slice(6, 8).join(', ')].filter(Boolean)
      : [keywords]
    const responses = await Promise.all(queries.map(group => fetch('https://api.tavily.com/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: discoveryQuery(group, location, source), search_depth: 'basic', auto_parameters: false, max_results: 20, include_answer: false, include_published_date: true, include_raw_content: false, include_domains: source === 'linkedin' ? ['linkedin.com'] : ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co'], ...(recency ? { time_range: recency } : {}) }),
      signal: AbortSignal.timeout(15000),
    })))
    const response = responses.find(r => !r.ok) || responses[0]
    if (!response.ok) return res.status(503).json({ error: [432, 433].includes(response.status) ? 'Monthly job-search allowance exhausted. Live search will resume when the provider allowance resets; your saved jobs remain available.' : response.status === 429 ? 'The search provider is temporarily busy. Please try again shortly.' : 'Web search is unavailable. Please try again later.' })
    const payloads = await Promise.all(responses.map(r => r.json()))
    const results = payloads.flatMap(data => Array.isArray(data.results) ? data.results.slice(0, 20) : []).map(result => ({ id: jobIdentity(result.url), url: result.url, title: String(result.title || 'Job listing').slice(0, 300), sourceDate: typeof result.published_date === 'string' ? result.published_date : null, snippet: String(result.content || '').slice(0, 1600), availability: 'unconfirmed' })).filter(job => job.id)
    const candidates = [...new Map(results.filter(job => matchesDiscovery(job, keywords, location)).map(job => [job.id, job])).values()]
    const verified = source === 'careers' ? await Promise.all(candidates.slice(0, 12).map(verifyBoardListing)) : candidates
    const unique = verified.filter(job => job && matchesDiscovery(job, keywords, location) && withinDiscoveryRecency(job, recency))
    const result = { results: unique, checkedAt: new Date().toISOString(), dateFilterApplied: Boolean(recency) }
    await reservation.finish(result)
    reservation = null
    return res.status(200).json(result)
  } catch { return res.status(503).json({ error: 'Search could not finish. Please try again later.' }) }
  finally { if (reservation?.status === 'reserved') await reservation.finish().catch(() => {}) }
}
