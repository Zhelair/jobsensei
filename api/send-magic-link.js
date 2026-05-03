import {
  canSendCustomAuthEmails,
  createMagicLinkForEmail,
  getMagicLinkRedirectUrl,
  sendMagicLinkEmail,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!canSendCustomAuthEmails()) {
    return res.status(503).json({ error: 'Custom auth emails are not configured on this deployment yet.' })
  }

  const email = String(req.body?.email || '').trim().toLowerCase()
  const redirectTo = getMagicLinkRedirectUrl(req.body?.redirectTo, req)

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }

  try {
    const magicLink = await createMagicLinkForEmail({
      email,
      redirectTo,
      data: {
        auth_source: 'jobsensei_settings',
      },
    })

    await sendMagicLinkEmail({
      email,
      magicLink,
      redirectTo,
      source: 'secure_sign_in',
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-magic-link failed:', err)
    return res.status(500).json({ error: 'Unable to send a secure sign-in link right now.' })
  }
}
