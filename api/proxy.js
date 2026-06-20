// Vercel serverless function â€” AI proxy for verified JobSensei supporters
// Validates BMAC token, then forwards AI requests to DeepSeek using the server-side API key
// Environment variables required: JWT_SECRET, DEEPSEEK_API_KEY

import {
  ACTIVE_PLAN_STATUSES,
  authenticateSupabaseUser,
  isSupabaseClientConfigured,
  isSupabaseServerConfigured,
  consumeHostedCredits,
  createSupabaseAdminClient,
  ensureSecureAccountAccess,
  ensureSecureDeviceAccess,
  HOSTED_REQUEST_CREDITS,
  looksLikeJwt,
  readSecureDeviceContext,
  readBearerToken,
  refundHostedCredits,
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
    if (isSupabaseServerConfigured() && isSupabaseClientConfigured()) {
      return {
        ok: false,
        status: 401,
        error: 'This deployment now requires secure email sign-in. Open Settings and sign in again to refresh your JobSensei access.',
      }
    }

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
  let deviceAccess

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

  try {
    deviceAccess = await ensureSecureDeviceAccess({
      supabase,
      user,
      ...readSecureDeviceContext(req),
      autoApprove: false,
    })
  } catch (lookupError) {
    console.error('proxy secure device lookup failed:', lookupError)
    return { ok: false, status: 500, error: 'Unable to validate approved device access right now.' }
  }

  if (deviceAccess.currentDeviceMissing) {
    return {
      ok: false,
      status: 403,
      error: 'This browser is missing its secure device id. Refresh Settings to re-register this device.',
    }
  }

  if (!deviceAccess.currentDeviceApproved) {
    return {
      ok: false,
      status: 403,
      error: deviceAccess.blockedReason === 'limit_reached'
        ? 'This browser is not approved for your secure JobSensei account because your 2-device limit is already full.'
        : deviceAccess.blockedReason === 'cooldown_active'
          ? 'A recently unlinked device started the 8-hour replacement cooldown. Try approving this browser again after the cooldown ends.'
          : 'This browser is not approved for your secure JobSensei account. Open Settings and refresh account access on this device.',
    }
  }

  return {
    ok: true,
    authMode: 'secure_account',
    userId: user.id,
    supabase,
    deviceId: deviceAccess.currentDevice?.deviceId || readSecureDeviceContext(req).deviceId || '',
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

  let creditsReserved = false

  try {
    if (auth.authMode === 'secure_account') {
      const consumeResult = await consumeHostedCredits({
        supabase: auth.supabase,
        userId: auth.userId,
        deviceId: auth.deviceId,
        route: 'proxy',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        cost: HOSTED_REQUEST_CREDITS,
      })

      if (!consumeResult?.charged) {
        const creditError = consumeResult?.error === 'insufficient_credits'
          ? 'You do not have enough hosted AI credits left on this account. Upgrade to Pro or switch to your own API key in Settings.'
          : 'Unable to reserve hosted AI credits right now.'
        return res.status(402).json({ error: creditError })
      }

      creditsReserved = true
    }

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
      if (creditsReserved && auth.authMode === 'secure_account') {
        await refundHostedCredits({
          supabase: auth.supabase,
          userId: auth.userId,
          deviceId: auth.deviceId,
          route: 'proxy',
          provider: 'deepseek',
          model: 'deepseek-v4-flash',
          amount: HOSTED_REQUEST_CREDITS,
          reason: 'provider_http_error',
        }).catch(refundError => console.error('credit refund failed after provider HTTP error:', refundError))
      }
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
    if (creditsReserved && auth.authMode === 'secure_account') {
      await refundHostedCredits({
        supabase: auth.supabase,
        userId: auth.userId,
        deviceId: auth.deviceId,
        route: 'proxy',
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        amount: HOSTED_REQUEST_CREDITS,
        reason: 'provider_exception',
      }).catch(refundError => console.error('credit refund failed after proxy exception:', refundError))
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy request failed. Please try again.' })
    }
  }
}
