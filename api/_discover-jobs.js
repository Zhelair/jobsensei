import { randomUUID } from 'node:crypto'
import { authenticateSupabaseUser } from './_lib/authBridge.js'
import { reserveServiceRequest, finishServiceRequest } from './_lib/serviceRequests.js'
import { jobIdentity, discoveryQuery, matchesDiscovery } from '../src/lib/jobDiscovery.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { keywords, location = '', source = 'linkedin', recency = '' } = req.body || {}
  if (typeof keywords !== 'string' || !keywords.trim() || keywords.length > 300 || typeof location !== 'string' || location.length > 100 || !['linkedin', 'careers'].includes(source) || !['', 'day', 'week', 'month'].includes(recency)) return res.status(400).json({ error: 'Invalid search preferences' })
  const { user } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to find jobs.' })
  if (!process.env.TAVILY_API_KEY) return res.status(503).json({ error: 'Job search is not configured yet.' })
  const id = randomUUID()
  let reserved = false
  try {
    const gate = await reserveServiceRequest(req, user, 'research', id, `discovery:${keywords}:${location}:${source}:${recency}`)
    if (gate !== 'reserved') {
      res.setHeader('Retry-After', '3600')
      return res.status(429).json({ retryAfter: 3600, error: gate === 'budget' ? 'The shared monthly web-search allowance is exhausted. Your saved jobs are still available.' : 'Live search is limited to 10 searches per account per hour, with an additional shared-network limit. Try again within an hour; cached results remain available.' })
    }
    reserved = true
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: discoveryQuery(keywords, location, source), search_depth: 'basic', auto_parameters: false, max_results: 20, include_answer: false, include_published_date: true, include_raw_content: false, include_domains: source === 'linkedin' ? ['linkedin.com'] : ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co'], ...(recency ? { time_range: recency } : {}) }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return res.status(503).json({ error: [432, 433].includes(response.status) ? 'The web-search provider has reached its usage limit. Please try again after the allowance resets.' : 'Web search is unavailable. Please try again later.' })
    const data = await response.json()
    const results = (Array.isArray(data.results) ? data.results : []).slice(0, 20).map(result => ({ id: jobIdentity(result.url), url: result.url, title: String(result.title || 'Job listing').slice(0, 300), sourceDate: typeof result.published_date === 'string' ? result.published_date : null, snippet: String(result.content || '').slice(0, 1600) })).filter(job => job.id)
    return res.status(200).json({ results: results.filter(job => matchesDiscovery(job, keywords, location)), checkedAt: new Date().toISOString() })
  } catch { return res.status(503).json({ error: 'Search could not finish. Please try again later.' }) }
  finally { if (reserved) await finishServiceRequest(id, 'sent').catch(() => {}) }
}
