import {
  createSupabaseAdminClient, getPaddleSignatureHeader, getPaddleWebhookConfig,
  getRawRequestBodyString, isPaddleWebhookConfigured, setDefaultCorsHeaders,
  verifyPaddleWebhookSignature,
} from './_lib/authBridge.js'
import { processPaddleEvent } from './_lib/paddleBilling.js'

const SUBSCRIPTION_EVENTS = new Set([
  'transaction.completed',
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

    // Provisioning is atomic, paid-period-based and bound to a server checkout.
    // The legacy email-matched provisioning path is deliberately not used.
    const result = await processPaddleEvent(createSupabaseAdminClient(), payload)
    return res.status(200).json({ ok: true, ...result })


  } catch (err) {
    console.error('paddle webhook failed:', err)
    return res.status(500).json({ error: 'Unable to process the Paddle webhook right now.' })
  }
}
