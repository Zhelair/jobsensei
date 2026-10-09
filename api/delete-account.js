import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  logSecureAuditEvent,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'
import { ownedSubscriptions, paddleRequest } from './_lib/paddleBilling.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  // getUser above verifies the bearer token. Refreshing a token must not count
  // as recent authentication: use the original AMR authentication timestamp.
  let authenticatedAt = 0
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer /i, '')
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    authenticatedAt = Math.max(0, ...(claims.amr || []).map(entry => Number(entry.timestamp) || 0))
  } catch {}
  if (authenticatedAt * 1000 < Date.now() - 15 * 60 * 1000) {
    return res.status(403).json({ error: 'Sign in again, then return here within 15 minutes to delete your account.' })
  }

  const body = req.body || {}
  const confirmEmail = String(body.confirmEmail || '').trim().toLowerCase()
  const userEmail = String(user.email || '').trim().toLowerCase()

  if (!userEmail || confirmEmail !== userEmail) {
    return res.status(400).json({ error: 'Enter the signed-in email exactly before deleting this secure account.' })
  }

  let deletionStarted = false
  try {
    const supabase = createSupabaseAdminClient()
    const now = new Date().toISOString()
    const subscriptions = await ownedSubscriptions(supabase, user.id)
    const { data: legacy, error: legacyError } = await supabase.from('plan_grants')
      .select('id, metadata').eq('user_id', user.id).eq('grant_type', 'bmac_webhook').eq('status', 'active')
    if (legacyError) throw legacyError
    const recurringLegacy = (legacy || []).some(grant => {
      const metadata = grant.metadata || {}
      const data = metadata.rawEvent?.data || metadata.rawEvent || {}
      return /membership|subscription/i.test(metadata.eventType || '') || data.membership_id || data.subscription_id
    })
    if (recurringLegacy) return res.status(409).json({ error: 'Cancel your Buy Me a Coffee membership there first and refresh your account before deleting it. One-time purchases do not require cancellation.' })
    // Keep ownership identifiers while provider cancellation is pending so the
    // same request can safely resume after a network/provider failure.
    const { error: freezeError } = await supabase.from('accounts')
      .update({ deletion_requested_at: now }).eq('user_id', user.id)
    if (freezeError) throw freezeError
    deletionStarted = true
    const { error: retireError } = await supabase.from('billing_subscriptions')
      .update({ deletion_requested: true }).eq('user_id', user.id)
    if (retireError) throw retireError
    for (const subscription of subscriptions) {
      const current = await paddleRequest(`/subscriptions/${subscription.subscription_id}`)
      if (current.status !== 'canceled') {
        const canceled = await paddleRequest(`/subscriptions/${subscription.subscription_id}/cancel`, {
          method: 'POST', body: { effective_from: 'immediately' },
        })
        if (canceled.status !== 'canceled') throw new Error('Cancellation has not been confirmed.')
      }
    }

    await logSecureAuditEvent({
      userId: user.id,
      action: 'account_delete_requested',
      metadata: {
        email: user.email || '',
      },
    })

    // Retire grants; deleting an account must never create reclaimable credit.
    const { data: releasedGrants, error: grantsError } = await supabase
      .from('plan_grants')
      .update({
        user_id: null,
        claim_email: null,
        status: 'revoked',
        metadata: { retired: true },
        claimed_at: null,
        updated_at: now,
      })
      .eq('user_id', user.id)
      .select('id')

    if (grantsError) {
      console.error('delete-account failed to release grants:', grantsError)
      return res.status(503).json({ error: 'Deletion is pending and AI access is paused. Retry Delete account to finish.', deletionPending: true })
    }

    await logSecureAuditEvent({
      userId: user.id,
      action: 'account_delete_grants_released',
      metadata: {
        email: user.email || '',
        grantCount: releasedGrants?.length || 0,
      },
    })

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('delete-account failed:', deleteError)
      return res.status(503).json({ error: 'Deletion is pending and AI access is paused. Retry Delete account to finish.', deletionPending: true })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('delete-account failed:', err)
    return res.status(503).json({ error: deletionStarted ? 'Deletion is pending and AI access is paused. Retry Delete account to finish.' : 'Unable to delete this secure account right now.', deletionPending: deletionStarted })
  }
}
