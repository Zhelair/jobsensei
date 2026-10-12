import { getPaddleWebhookConfig } from './authBridge.js'

export async function paddleRequest(path, { method = 'GET', body } = {}) {
  const { apiKey, apiBaseUrl } = getPaddleWebhookConfig()
  if (!apiKey) {
    const error = new Error('Paddle API key missing')
    error.checkoutRejected = true
    error.publicMessage = 'Paddle server configuration is incomplete. Contact support.'
    throw error
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = String(payload.error?.code || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80)
    const error = new Error(`Paddle request failed: HTTP ${response.status}${code ? ` (${code})` : ''}`)
    error.code = code
    error.checkoutRejected = response.status >= 400 && response.status < 500
    error.publicMessage = code === 'transaction_default_checkout_url_not_set'
      ? 'Paddle default payment link is missing. Set it in Paddle > Checkout > Checkout configuration.'
      : response.status === 401 || response.status === 403
      ? 'Paddle rejected the server credentials or permissions. Check the API key and sandbox/live environment.'
      : `Paddle could not create or update billing (HTTP ${response.status}${code ? `, ${code}` : ''}). Contact support.`
    throw error
  }
  return payload.data
}

export async function ownedSubscriptions(supabase, userId) {
  const { data, error } = await supabase.from('billing_subscriptions')
    .select('*').eq('user_id', userId)
  if (error) throw error
  return data || []
}

export async function processPaddleEvent(supabase, payload) {
  const eventId = payload.event_id
  const eventAt = payload.occurred_at
  const type = payload.event_type
  if (!eventId || !Number.isFinite(Date.parse(eventAt))) throw new Error('Missing event identity or timestamp.')
  const transaction = type === 'transaction.completed' ? payload.data : null
  const subscriptionId = transaction?.subscription_id || payload.data?.id
  if (!/^sub_[a-z\d]+$/.test(subscriptionId || '')) return { skipped: true }
  // Read current provider state rather than applying a stale event snapshot.
  const subscription = await paddleRequest(`/subscriptions/${subscriptionId}`)
  const priceId = process.env.PADDLE_PRO_PRICE_ID
  if (!priceId) throw new Error('Server Pro price is not configured.')
  if (!subscription.items?.some(item => item.price?.id === priceId)) return { skipped: true }
  const { data, error } = await supabase.rpc('apply_paddle_billing_event', {
    p_event_id: eventId, p_occurred_at: eventAt,
    p_subscription: subscription, p_transaction: transaction,
  })
  if (error) throw error
  return data
}
