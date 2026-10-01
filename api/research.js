// Vercel serverless function — Company research via Tavily Search API
// Uses server-side TAVILY_API_KEY (never exposed to frontend)
// Returns { answer, snippets, sources } on success
// Returns { fallback: true, reason } when Tavily is unavailable
import { randomUUID } from 'node:crypto'
import { authenticateSupabaseUser } from './_lib/authBridge.js'
import { reserveServiceRequest, finishServiceRequest } from './_lib/serviceRequests.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company, role } = req.body || {}
  if (typeof company !== 'string' || !company.trim() || company.length > 200 || (role != null && (typeof role !== 'string' || role.length > 300))) return res.status(400).json({ error: 'Invalid company or role' })
  const { user } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ fallback: true, reason: 'sign_in_required' })

  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    return res.status(200).json({ fallback: true, reason: 'not_configured' })
  }

  const currentYear = new Date().getUTCFullYear()
  const query = role
    ? `${company} company news ${currentYear} recent developments culture work environment ${role} interview`
    : `${company} company news ${currentYear} recent developments culture work environment interview preparation`

  const requestId = randomUUID()
  try {
    const gate = await reserveServiceRequest(req, user, 'research', requestId, `${company}:${role || ''}`)
    if (gate !== 'reserved') return res.status(200).json({ fallback: true, reason: gate === 'budget' ? 'budget_reached' : 'rate_limited' })
    const tavilyRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (tavilyRes.status === 429) {
      return res.status(200).json({ fallback: true, reason: 'rate_limited' })
    }

    if (tavilyRes.status === 432 || tavilyRes.status === 433) return res.status(200).json({ fallback: true, reason: 'provider_usage_limit' })

    if (!tavilyRes.ok) {
      return res.status(200).json({ fallback: true, reason: 'api_error' })
    }

    const data = await tavilyRes.json()

    const snippets = (data.results || []).map(r => `[${r.title}]: ${r.content}`).join('\n\n')
    const sources = (data.results || []).map(r => ({ title: r.title, url: r.url }))

    return res.status(200).json({
      answer: data.answer || '',
      snippets,
      sources,
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(200).json({ fallback: true, reason: 'network_error' })
  } finally {
    await finishServiceRequest(requestId, 'sent').catch(() => {})
  }
}
