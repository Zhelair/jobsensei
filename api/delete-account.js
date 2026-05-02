import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(res)

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
