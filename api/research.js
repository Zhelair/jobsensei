// Vercel serverless function — Company research via Tavily Search API
// Uses server-side TAVILY_API_KEY (never exposed to frontend)
// Returns { answer, snippets, sources } on success
// Returns { fallback: true, reason } when Tavily is unavailable

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company, role } = req.body || {}
  if (!company) return res.status(400).json({ error: 'company is required' })

  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    return res.status(200).json({ fallback: true, reason: 'not_configured' })
  }

  const query = role
    ? `${company} company culture tech stack engineering ${role} interview`
    : `${company} company culture tech stack engineering interview prep`

  try {
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
    })

    if (tavilyRes.status === 429) {
      return res.status(200).json({ fallback: true, reason: 'limit_reached' })
    }

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
    })
  } catch (err) {
    console.error('research error:', err)
    return res.status(200).json({ fallback: true, reason: 'network_error' })
  }
}
