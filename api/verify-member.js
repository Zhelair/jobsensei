// Vercel serverless function â€” verify supporter access code and issue a signed token
// Environment variables required: JWT_SECRET, ACCESS_CODES (comma-separated list of valid codes)

import {
  getLegacyAccessCodes,
  isSupabaseServerConfigured,
  normalizeEmail,
  setDefaultCorsHeaders,
  signLegacyAccessToken,
} from './_lib/authBridge.js'

function looksLikeEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default async function handler(req, res) {
  // Always return JSON â€” never let Vercel return an HTML error page
  try {
    setDefaultCorsHeaders(req, res)

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const body = req.body || {}
    const code = (body.email || body.code || '').toString()
    const input = code.trim()

    if (!input) {
      return res.status(400).json({ error: 'Access code is required' })
    }

    if (looksLikeEmail(input)) {
      if (!isSupabaseServerConfigured()) {
        return res.status(503).json({ error: 'Email-based unlock is not configured on this deployment yet.' })
      }

      return res.status(200).json({
        next: 'magic_link',
        email: normalizeEmail(input),
      })
    }

    const validCodes = getLegacyAccessCodes()
    if (!process.env.JWT_SECRET || !validCodes.length) {
      console.error('verify-member: missing legacy tester configuration')
      return res.status(500).json({ error: 'Tester-code unlock is not configured on this deployment yet.' })
    }
    const normalizedCode = input.toLowerCase()

    if (!validCodes.includes(normalizedCode)) {
      return res.status(403).json({
        error: 'Invalid access code. Check the code you received after supporting on Buy Me a Coffee.',
      })
    }

    const token = signLegacyAccessToken({
      code: normalizedCode,
    })

    return res.status(200).json({
      next: 'legacy_code',
      token,
    })
  } catch (err) {
    console.error('verify-member unhandled error:', err)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}
