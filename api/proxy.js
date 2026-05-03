// Vercel serverless function â€” AI proxy for verified JobSensei supporters
// Validates BMAC token, then forwards AI requests to DeepSeek using the server-side API key
// Environment variables required: JWT_SECRET, DEEPSEEK_API_KEY

import {
  ACTIVE_PLAN_STATUSES,
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  ensureSecureAccountAccess,
  getRequestDeviceId,
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
      auditUserId: null,
      auditDeviceId: null,
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

  const deviceId = getRequestDeviceId(req)
  if (!deviceId) {
    return { ok: false, status: 400, error: 'A secure device id is required for account-based access.' }
  }

  const supabase = createSupabaseAdminClient()
  let accessSync

  try {
    accessSync = await ensureSecureAccountAccess({
      supabase,
      user,
      deviceId,
      deviceName: 'Browser device',
      deviceLabel: 'Current browser',
    })
  } catch (lookupError) {
    console.error('proxy secure auth lookup failed:', lookupError)
    return { ok: false, status: 500, error: 'Unable to validate secure account access right now.' }
  }

  const account = accessSync.account
  const device = accessSync.devices.find(candidate => candidate.device_id === deviceId)

  if (!account || !ACTIVE_PLAN_STATUSES.has(account.plan_status)) {
    return { ok: false, status: 403, error: 'Your secure JobSensei plan is not active on this account.' }
  }

  if (accessSync.deviceApproval && !accessSync.deviceApproval.ok) {
    return {
      ok: false,
      status: accessSync.deviceApproval.reason === 'cooldown' ? 429 : 403,
      error: accessSync.deviceApproval.message,
    }
  }

  if (!device || !device.approved_at || device.revoked_at) {
    return { ok: false, status: 403, error: 'This device is not approved for secure JobSensei access yet.' }
  }

  return {
    ok: true,
    authMode: 'secure_account',
    userId: user.id,
    deviceId,
    auditUserId: user.id,
    auditDeviceId: deviceId,
  }
}

async function logUsageEvent({ authMode, userId, deviceId, route, provider, model }) {
  if (!userId) return

  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('api_usage_events').insert({
      user_id: userId,
      device_id: deviceId,
      route,
      auth_mode: authMode,
      provider,
      model,
    })
  } catch (err) {
    console.error('proxy usage log failed:', err)
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
      await logUsageEvent({
        authMode: auth.authMode,
        userId: auth.auditUserId,
        deviceId: auth.auditDeviceId,
        route: '/api/proxy',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
      })
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
    await logUsageEvent({
      authMode: auth.authMode,
      userId: auth.auditUserId,
      deviceId: auth.auditDeviceId,
      route: '/api/proxy',
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
    })
    res.end()
  } catch (err) {
    console.error('proxy error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy request failed. Please try again.' })
    }
  }
}
