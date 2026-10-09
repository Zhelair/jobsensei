import crypto from 'node:crypto'
import { authenticateSupabaseUser, createSupabaseAdminClient } from './_lib/authBridge.js'
import { ownedSubscriptions, paddleRequest } from './_lib/paddleBilling.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { user } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error: 'Sign in to your JobSensei account first.' })
  const supabase = createSupabaseAdminClient()
  try {
    const { data: account, error } = await supabase.from('accounts')
      .select('deletion_requested_at').eq('user_id', user.id).single()
    if (error) throw error
    if (account.deletion_requested_at) return res.status(409).json({ error: 'Account deletion is pending.' })
    const subscriptions = await ownedSubscriptions(supabase, user.id)
    const action = req.body?.action
    if (action === 'status') return res.status(200).json({ subscriptions: subscriptions.map(s => ({
      id: s.subscription_id, status: s.status, paidUntil: s.paid_until,
      scheduledChange: s.scheduled_change,
    })) })
    if (action === 'checkout') {
      if (subscriptions.some(s => ['active', 'trialing', 'past_due', 'paused'].includes(s.status))) {
        return res.status(409).json({ error: 'Manage your existing subscription before starting another.' })
      }
      const priceId = process.env.PADDLE_PRO_PRICE_ID
      if (!priceId) return res.status(503).json({ error: 'Paddle checkout is not configured yet.' })
      const checkoutId = crypto.randomUUID()
      const { data: reservation, error: reserveError } = await supabase.rpc('reserve_billing_checkout', {
        p_user_id: user.id, p_checkout_id: checkoutId,
      })
      if (reserveError) throw reserveError
      if (reservation.status === 'reused') return res.status(200).json({ transactionId: reservation.transactionId })
      if (reservation.status !== 'reserved') return res.status(409).json({ error: 'A checkout or subscription is already in progress. Please wait, or use Manage billing.' })
      const transaction = await paddleRequest('/transactions', { method: 'POST', body: {
        items: [{ price_id: priceId, quantity: 1 }], collection_mode: 'automatic',
        custom_data: { jobsensei_checkout_id: checkoutId },
      } })
      const { error: saveError } = await supabase.from('billing_checkouts')
        .update({ transaction_id: transaction.id }).eq('id', checkoutId)
      if (saveError) throw saveError
      return res.status(200).json({ transactionId: transaction.id })
    }
    if (action === 'cancel') {
      const owned = subscriptions.find(s => s.subscription_id === req.body.subscriptionId)
      if (!owned) return res.status(404).json({ error: 'Subscription not found.' })
      const current = await paddleRequest(`/subscriptions/${owned.subscription_id}`)
      if (current.status === 'canceled' || current.scheduled_change?.action === 'cancel') {
        return res.status(200).json({ status: current.status, scheduledChange: current.scheduled_change })
      }
      if (current.status !== 'active') return res.status(409).json({ error: 'Use Manage billing to cancel this subscription in its current state.' })
      const updated = await paddleRequest(`/subscriptions/${owned.subscription_id}/cancel`, {
        method: 'POST', body: { effective_from: 'next_billing_period' },
      })
      const { error: saveError } = await supabase.from('billing_subscriptions')
        .update({ status: updated.status, scheduled_change: updated.scheduled_change })
        .eq('subscription_id', owned.subscription_id).eq('user_id', user.id)
      if (saveError) throw saveError
      return res.status(200).json({ status: updated.status, scheduledChange: updated.scheduled_change })
    }
    return res.status(400).json({ error: 'Unknown billing action.' })
  } catch (error) {
    console.error('Billing action failed:', error.code || error.message)
    return res.status(503).json({ error: 'Billing is temporarily unavailable. Please try again.' })
  }
}
