import {
  canSendCustomAuthEmails,
  createMagicLinkForEmail,
  createSupabaseAdminClient,
  extractPaddleGrantDetails,
  fetchPaddleCustomerEmail,
  getPaddleSignatureHeader,
  getPaddleWebhookConfig,
  getRawRequestBodyString,
  getSecureSettingsUrl,
  isPaddleWebhookConfigured,
  sendMagicLinkEmail,
  setDefaultCorsHeaders,
  upsertPaddlePlanGrant,
  verifyPaddleWebhookSignature,
} from './_lib/authBridge.js'

const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.activated',
  'subscription.trialing',
  'subscription.updated',
  'subscription.resumed',
  'subscription.canceled',
  'subscription.paused',
  'subscription.past_due',
])

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isPaddleWebhookConfigured()) {
    return res.status(503).json({ error: 'Paddle webhook is not configured on this deployment yet.' })
  }

  const rawBody = getRawRequestBodyString(req)
  const signature = getPaddleSignatureHeader(req)
  const { webhookSecret } = getPaddleWebhookConfig()

  if (!verifyPaddleWebhookSignature({ payload: rawBody, signature, secret: webhookSecret })) {
    return res.status(401).json({ error: 'Invalid webhook signature.' })
  }

  try {
    const payload = typeof req.body === 'object' && req.body
      ? req.body
      : JSON.parse(rawBody || '{}')
    const eventType = String(payload?.event_type || '').trim().toLowerCase()

    if (!SUBSCRIPTION_EVENTS.has(eventType)) {
      return res.status(202).json({
        ok: true,
        skipped: true,
        reason: 'Webhook event is not used for JobSensei provisioning.',
        eventType,
      })
    }

    const customerEmail = await fetchPaddleCustomerEmail({
      customerId: payload?.data?.customer_id,
    })
    const grantDetails = extractPaddleGrantDetails(payload, { customerEmail })

    if (!grantDetails.email) {
      return res.status(400).json({ error: 'Webhook payload did not include a purchaser email.' })
    }

    if (!grantDetails.shouldGrantAccess && grantDetails.status === 'active') {
      return res.status(202).json({
        ok: true,
        skipped: true,
        reason: 'Webhook event did not match the configured Paddle product or price allow-list.',
        eventType: grantDetails.eventType,
        identifiers: grantDetails.identifiers,
        hint: 'Update PADDLE_ALLOWED_PRODUCT_IDS / PRICE_IDS / PRODUCT_NAMES / PRICE_NAMES if this purchase should unlock JobSensei.',
      })
    }

    const supabase = createSupabaseAdminClient()
    const { grant, userId, created, statusChanged } = await upsertPaddlePlanGrant({
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
          auth_source: 'paddle_webhook',
          payment_provider: 'paddle',
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
    console.error('paddle webhook failed:', err)
    return res.status(500).json({ error: 'Unable to process the Paddle webhook right now.' })
  }
}
