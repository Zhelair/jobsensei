// Vercel serverless function — AI proxy for verified JobSensei supporters
// Validates BMAC token, then forwards AI requests to DeepSeek using the server-side API key
// Environment variables required: JWT_SECRET, DEEPSEEK_API_KEY

import crypto from 'node:crypto'

function verifyToken(token) {
  try {
    const { data, sig } = JSON.parse(Buffer.from(token, 'base64').toString())
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET)
    hmac.update(data)
    const expected = hmac.digest('hex')
    if (expected !== sig) return null
    const payload = JSON.parse(data)
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Validate token from Authorization header
  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authorization required' })

  const payload = verifyToken(token)
  if (!payload) return res.status(401).json({ error: 'Invalid or expired access token. Please re-verify your BMAC membership in Settings.' })

  if (!process.env.DEEPSEEK_API_KEY || !process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const { systemPrompt, messages, temperature = 0.7, stream = false } = req.body || {}
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  try {
    const deepseekRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature,
        stream,
        messages: systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages]
          : messages,
      }),
    })

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text()
      return res.status(deepseekRes.status).json({ error: `AI error: ${errText}` })
    }

    if (!stream) {
      const data = await deepseekRes.json()
      return res.status(200).json({ content: data.choices[0].message.content })
    }

    // Stream SSE chunks back to client
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = deepseekRes.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
    res.end()
  } catch (err) {
    console.error('proxy error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy request failed. Please try again.' })
    }
  }
}
