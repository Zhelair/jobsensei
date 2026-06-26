import {
  canSendCustomAuthEmails,
  createMagicLinkForEmail,
  createSupabaseAdminClient,
  extractLemonSqueezyGrantDetails,
  getLemonSqueezyCheckoutConfig,
  getLemonSqueezySignatureHeader,
  getRawRequestBodyString,
  getSecureSettingsUrl,
  isLemonSqueezyWebhookConfigured,
  sendMagicLinkEmail,
  setDefaultCorsHeaders,
  upsertLemonSqueezyPlanGrant,
  verifyLemonSqueezyWebhookSignature,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isLemonSqueezyWebhookConfigured()) {
    return res.status(503).json({ error: 'Lemon Squeezy webhook is not configured on this deployment yet.' })
  }

  const rawBody = getRawRequestBodyString(req)
  const signature = getLemonSqueezySignatureHeader(req)
  const { webhookSecret } = getLemonSqueezyCheckoutConfig()

  if (!verifyLemonSqueezyWebhookSignature({ payload: rawBody, signature, secret: webhookSecret })) {
    return res.status(401).json({ error: 'Invalid webhook signature.' })
  }

  try {
    const payload = typeof req.body === 'object' && req.body
      ? req.body
      : JSON.parse(rawBody || '{}')
    const grantDetails = extractLemonSqueezyGrantDetails(payload, rawBody)

    if (!grantDetails.email) {
      return res.status(400).json({ error: 'Webhook payload did not include a purchaser email.' })
    }

    if (!grantDetails.shouldGrantAccess && grantDetails.status === 'active') {
      return res.status(202).json({
        ok: true,
        skipped: true,
        reason: 'Webhook event did not match the configured Lemon Squeezy product or variant allow-list.',
        eventType: grantDetails.eventType,
        identifiers: grantDetails.identifiers,
        hint: 'Update LEMONSQUEEZY_ALLOWED_PRODUCT_IDS / VARIANT_IDS / PRODUCT_NAMES / VARIANT_NAMES if this purchase should unlock JobSensei.',
      })
    }

    const supabase = createSupabaseAdminClient()
    const { grant, userId, created, statusChanged } = await upsertLemonSqueezyPlanGrant({
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
          auth_source: 'lemonsqueezy_webhook',
          payment_provider: 'lemonsqueezy',
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
    console.error('lemonsqueezy webhook failed:', err)
    return res.status(500).json({ error: 'Unable to process the Lemon Squeezy webhook right now.' })
  }
}
