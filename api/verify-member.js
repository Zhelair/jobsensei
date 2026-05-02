// Vercel serverless function â€” verify supporter access code and issue a signed token
// Environment variables required: JWT_SECRET, ACCESS_CODES (comma-separated list of valid codes)

import {
  getLegacyAccessCodes,
  setDefaultCorsHeaders,
  signLegacyAccessToken,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  // Always return JSON â€” never let Vercel return an HTML error page
  try {
    setDefaultCorsHeaders(req, res)

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    if (!process.env.JWT_SECRET || !process.env.ACCESS_CODES) {
      console.error('verify-member: missing env vars JWT_SECRET or ACCESS_CODES')
      return res.status(500).json({ error: 'Server not configured yet. Contact support.' })
    }

    const body = req.body || {}
    const code = (body.email || body.code || '').toString()

    if (!code.trim()) {
      return res.status(400).json({ error: 'Access code is required' })
    }

    const validCodes = getLegacyAccessCodes()
    const input = code.trim().toLowerCase()

    if (!validCodes.includes(input)) {
      return res.status(403).json({
        error: 'Invalid access code. Check the code you received after supporting on Buy Me a Coffee.',
      })
    }

    const token = signLegacyAccessToken({
      code: input,
    })

    return res.status(200).json({ token })
  } catch (err) {
    console.error('verify-member unhandled error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
