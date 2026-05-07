// Vercel serverless function â€” AI proxy for verified JobSensei supporters
// Validates BMAC token, then forwards AI requests to DeepSeek using the server-side API key
// Environment variables required: JWT_SECRET, DEEPSEEK_API_KEY

import {
  ACTIVE_PLAN_STATUSES,
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  ensureSecureAccountAccess,
  looksLikeJwt,
  readBearerToken,
  setDefaultCorsHeaders,
  verifyLegacyAccessToken,
} from './_lib/authBridge.js'

async function authorizeProxyRequest(req) {
  const token = readBearerToken(req)
  if (!token) {
    return { ok: false, status: 401, error: 'Authorization required' }
  }

  const legacyPayload = verifyLegacyAccessToken(token)
  if (legacyPayload) {
    return {
      ok: true,
      authMode: 'legacy',
      legacyPayload,
    }
  }

  if (!looksLikeJwt(token)) {
    return {
      ok: false,
      status: 401,
      error: 'Invalid or expired access token. Please re-verify your BMAC membership in Settings.',
    }
  }

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) {
    return { ok: false, status: 401, error }
  }

  const supabase = createSupabaseAdminClient()
  let accessSync

  try {
    accessSync = await ensureSecureAccountAccess({
      supabase,
      user,
    })
  } catch (lookupError) {
    console.error('proxy secure auth lookup failed:', lookupError)
    return { ok: false, status: 500, error: 'Unable to validate secure account access right now.' }
  }

  const account = accessSync.account
  if (!account || !ACTIVE_PLAN_STATUSES.has(account.plan_status)) {
    return { ok: false, status: 403, error: 'Your secure JobSensei plan is not active on this account.' }
  }

  return {
    ok: true,
    authMode: 'secure_account',
    userId: user.id,
  }
}

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await authorizeProxyRequest(req)
  if (!auth.ok) {
    return res.status(auth.status).json({
      error: auth.error,
    })
  }

  if (!process.env.DEEPSEEK_API_KEY || (auth.authMode === 'legacy' && !process.env.JWT_SECRET)) {
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
        model: 'deepseek-v4-flash',
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
