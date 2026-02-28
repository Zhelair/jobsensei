// Vercel serverless function — verify supporter access code and issue a signed token
// Environment variables required: JWT_SECRET, ACCESS_CODES (comma-separated list of valid codes)

const crypto = require('crypto')

function signToken(payload) {
  const data = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET)
  hmac.update(data)
  const sig = hmac.digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64')
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email: code } = req.body || {} // frontend sends field named "email", we treat it as a code
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Access code is required' })
  }

  if (!process.env.JWT_SECRET || !process.env.ACCESS_CODES) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const validCodes = process.env.ACCESS_CODES
    .split(',')
    .map(c => c.trim().toLowerCase())
    .filter(Boolean)

  const input = code.trim().toLowerCase()

  if (!validCodes.includes(input)) {
    return res.status(403).json({
      error: 'Invalid access code. Check the code you received after supporting on Buy Me a Coffee.',
    })
  }

  // Issue a token valid for 365 days (access codes don't expire often)
  const token = signToken({
    code: input,
    exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
  })

  return res.status(200).json({ token })
}
