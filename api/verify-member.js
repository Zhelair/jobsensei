// Vercel serverless function — verify BMAC membership via Vercel KV and issue a signed access token
// Environment variables required: JWT_SECRET, KV_REST_API_URL, KV_REST_API_TOKEN

const crypto = require('crypto')

function signToken(payload) {
  const data = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET)
  hmac.update(data)
  const sig = hmac.digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64')
}

async function kvGet(key) {
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  if (!res.ok) throw new Error(`KV error: ${res.status}`)
  const json = await res.json()
  return json.result // null if not found, otherwise the stored value
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body || {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  if (!process.env.JWT_SECRET || !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const normalizedEmail = email.trim().toLowerCase()
    const value = await kvGet(`supporter:${normalizedEmail}`)

    if (!value) {
      return res.status(403).json({
        error: 'No active Buy Me a Coffee membership found for this email. Make sure you use the email from your BMAC account.',
      })
    }

    // Issue a token valid for 30 days
    const token = signToken({
      email: normalizedEmail,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })

    return res.status(200).json({ token })
  } catch (err) {
    console.error('verify-member error:', err)
    return res.status(500).json({ error: 'Could not verify membership. Please try again.' })
  }
}
