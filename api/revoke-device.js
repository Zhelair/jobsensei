import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  ensureSecureDeviceAccess,
  readSecureDeviceContext,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  const targetDeviceId = String(req.body?.deviceId || '').trim().toLowerCase()
  if (!targetDeviceId) {
    return res.status(400).json({ error: 'Device id is required.' })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data: currentRow, error: lookupError } = await supabase
      .from('device_registrations')
      .select('id, device_id, approved_at, revoked_at')
      .eq('user_id', user.id)
      .eq('device_id', targetDeviceId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (!currentRow?.approved_at || currentRow?.revoked_at) {
      return res.status(404).json({ error: 'Approved device not found.' })
    }

    const now = new Date().toISOString()
    const { error: revokeError } = await supabase
      .from('device_registrations')
      .update({
        revoked_at: now,
        last_seen_at: now,
      })
      .eq('id', currentRow.id)

    if (revokeError) throw revokeError

    const deviceAccess = await ensureSecureDeviceAccess({
      supabase,
      user,
      ...readSecureDeviceContext(req),
      autoApprove: false,
    })

    return res.status(200).json({
      ok: true,
      revokedDeviceId: targetDeviceId,
      deviceAccess,
    })
  } catch (err) {
    console.error('revoke-device failed:', err)
    return res.status(500).json({ error: 'Unable to unlink this device right now.' })
  }
}
