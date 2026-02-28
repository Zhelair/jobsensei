// Vercel serverless function — receives BMAC webhook events and maintains supporter list in Vercel KV
// BMAC fires this endpoint when a supporter subscribes or cancels
// Environment variables required: BMAC_WEBHOOK_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN

const crypto = require('crypto')

function verifyBmacSignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  const expected = hmac.digest('hex')
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

async function kvSet(key, value) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
    method: 'GET', // Vercel KV REST uses GET for simple set
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  if (!res.ok) throw new Error(`KV set error: ${res.status}`)
}

async function kvDel(key) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/del/${encodeURIComponent(key)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  if (!res.ok) throw new Error(`KV del error: ${res.status}`)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature-SHA256')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.BMAC_WEBHOOK_SECRET || !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // Verify BMAC webhook signature
  const signature = req.headers['x-signature-sha256'] || ''
  const rawBody = JSON.stringify(req.body)

  if (!signature || !verifyBmacSignature(rawBody, signature, process.env.BMAC_WEBHOOK_SECRET)) {
    console.warn('webhook: invalid signature')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { type, data } = req.body || {}
  const email = (data?.supporter_email || data?.payer_email || '').trim().toLowerCase()

  if (!email) {
    // Unknown payload shape — ack and ignore
    return res.status(200).json({ ok: true })
  }

  try {
    if (type === 'membership.started' || type === 'membership.updated') {
      // New or renewed supporter — add to KV
      await kvSet(`supporter:${email}`, '1')
      console.log(`webhook: added supporter ${email}`)
    } else if (type === 'membership.cancelled') {
      // Cancelled — remove from KV
      await kvDel(`supporter:${email}`)
      console.log(`webhook: removed supporter ${email}`)
    } else {
      // Other event types (payment, etc.) — ack and ignore
      console.log(`webhook: unhandled event type ${type}`)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('webhook error:', err)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
}
