import {
  canSendCustomAuthEmails,
  createMagicLinkForEmail,
  createSupabaseAdminClient,
  extractBmacGrantDetails,
  getBmacSignatureHeader,
  getRawRequestBodyString,
  getSecureSettingsUrl,
  isBmacWebhookConfigured,
  sendMagicLinkEmail,
  setDefaultCorsHeaders,
  upsertBmacPlanGrant,
  verifyBmacWebhookSignature,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isBmacWebhookConfigured()) {
    return res.status(503).json({ error: 'BMAC webhook is not configured on this deployment yet.' })
  }

  const rawBody = getRawRequestBodyString(req)
  const signature = getBmacSignatureHeader(req)
  const secret = process.env.BMAC_WEBHOOK_SECRET || process.env.BMAC_WEBHOOK_SIGNING_SECRET

  if (!verifyBmacWebhookSignature({ payload: rawBody, signature, secret })) {
    return res.status(401).json({ error: 'Invalid webhook signature.' })
  }

  try {
    const payload = typeof req.body === 'object' && req.body
      ? req.body
      : JSON.parse(rawBody || '{}')
    const grantDetails = extractBmacGrantDetails(payload, rawBody)

    if (!grantDetails.email) {
      return res.status(400).json({ error: 'Webhook payload did not include a purchaser email.' })
    }

    if (!grantDetails.shouldGrantAccess && grantDetails.status === 'active') {
      return res.status(202).json({
        ok: true,
        skipped: true,
        reason: 'Webhook event did not match the configured BMAC access products.',
      })
    }

    const supabase = createSupabaseAdminClient()
    const { grant, userId, created, statusChanged } = await upsertBmacPlanGrant({
      supabase,
      email: grantDetails.email,
      externalRef: grantDetails.externalRef,
      status: grantDetails.status,
      metadata: grantDetails.metadata,
    })

    let emailed = false
    if (grantDetails.status === 'active' && canSendCustomAuthEmails() && (created || statusChanged)) {
      const redirectTo = getSecureSettingsUrl(req)
      const magicLink = await createMagicLinkForEmail({
        email: grantDetails.email,
        redirectTo,
        data: {
          auth_source: 'bmac_webhook',
          payment_provider: 'bmac',
        },
      })

      await sendMagicLinkEmail({
        email: grantDetails.email,
        magicLink,
        redirectTo,
        source: 'purchase_claim',
      })

      emailed = true
    }

    return res.status(200).json({
      ok: true,
      grantId: grant.id,
      emailed,
      linkedUserId: userId,
      status: grant.status,
    })
  } catch (err) {
    console.error('bmac webhook failed:', err)
    return res.status(500).json({ error: 'Unable to process the BMAC webhook right now.' })
  }
}
