// Vercel serverless function — verify BMAC membership and issue a signed access token
// Environment variables required: BMAC_TOKEN, JWT_SECRET

const crypto = require('crypto')

function signToken(payload) {
  const data = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET)
  hmac.update(data)
  const sig = hmac.digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64')
}

async function fetchBmacSubscriptions() {
  const res = await fetch('https://developers.buymeacoffee.com/api/v1/subscriptions?status=active', {
    headers: { Authorization: `Bearer ${process.env.BMAC_TOKEN}` },
  })
  if (!res.ok) throw new Error(`BMAC API error: ${res.status}`)
  return res.json()
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

  if (!process.env.BMAC_TOKEN || !process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const data = await fetchBmacSubscriptions()
    const normalizedEmail = email.trim().toLowerCase()

    // Check active subscriptions for matching email
    const isSupporter = Array.isArray(data.data) && data.data.some(sub => {
      const subEmail = (sub.payer_email || sub.subscription_email || '').toLowerCase()
      return subEmail === normalizedEmail && !sub.subscription_is_cancelled
    })

    if (!isSupporter) {
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
