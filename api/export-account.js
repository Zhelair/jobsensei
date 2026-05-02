import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

export default async function handler(req, res) {
  setDefaultCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  try {
    const supabase = createSupabaseAdminClient()

    const [{ data: account, error: accountError }, { data: devices, error: devicesError }, { data: grants, error: grantsError }] = await Promise.all([
      supabase
        .from('accounts')
        .select('email, plan_status, plan_source, linked_at, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('device_registrations')
        .select('device_id, device_name, device_label, approved_at, revoked_at, last_seen_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('plan_grants')
        .select('grant_type, external_ref, status, metadata, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
    ])

    if (accountError || devicesError || grantsError) {
      console.error('export-account query failed:', accountError || devicesError || grantsError)
      return res.status(500).json({ error: 'Unable to export secure account data right now.' })
    }

    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email || '',
      },
      account: account || null,
      devices: devices || [],
      planGrants: grants || [],
    })
  } catch (err) {
    console.error('export-account failed:', err)
    return res.status(500).json({ error: 'Unable to export secure account data right now.' })
  }
}
