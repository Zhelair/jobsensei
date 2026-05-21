import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  logSecureAuditEvent,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  const body = req.body || {}
  const confirmEmail = String(body.confirmEmail || '').trim().toLowerCase()
  const userEmail = String(user.email || '').trim().toLowerCase()

  if (userEmail && confirmEmail !== userEmail) {
    return res.status(400).json({ error: 'Enter the signed-in email exactly before deleting this secure account.' })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const now = new Date().toISOString()

    await logSecureAuditEvent({
      userId: user.id,
      action: 'account_delete_requested',
      metadata: {
        email: user.email || '',
      },
    })

    // Release plan grants back to the email before deleting the auth user so
    // the same person can sign in again later and reclaim access cleanly.
    const { data: releasedGrants, error: grantsError } = await supabase
      .from('plan_grants')
      .update({
        user_id: null,
        claim_email: userEmail || null,
        claimed_at: null,
        updated_at: now,
      })
      .eq('user_id', user.id)
      .select('id')

    if (grantsError) {
      console.error('delete-account failed to release grants:', grantsError)
      return res.status(500).json({ error: 'Unable to delete this secure account right now.' })
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
      return res.status(500).json({ error: 'Unable to delete this secure account right now.' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('delete-account failed:', err)
    return res.status(500).json({ error: 'Unable to delete this secure account right now.' })
  }
}
