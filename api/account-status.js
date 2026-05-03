import {
  ACTIVE_PLAN_STATUSES,
  SECURE_DEVICE_LIMIT,
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  getDeviceReplacementCooldown,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

function toAccountSummary(account) {
  if (!account) return null

  return {
    email: account.email,
    planStatus: account.plan_status,
    planSource: account.plan_source,
    linkedAt: account.linked_at,
    linked: Boolean(account.linked_at),
    planActive: ACTIVE_PLAN_STATUSES.has(account.plan_status),
  }
}

function toDeviceSummary(device) {
  return {
    id: device.id,
    deviceId: device.device_id,
    deviceName: device.device_name,
    deviceLabel: device.device_label,
    approvedAt: device.approved_at,
    revokedAt: device.revoked_at,
    lastSeenAt: device.last_seen_at,
  }
}

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  try {
    const supabase = createSupabaseAdminClient()

    const [{ data: account, error: accountError }, { data: devices, error: devicesError }] = await Promise.all([
      supabase
        .from('accounts')
        .select('email, plan_status, plan_source, linked_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('device_registrations')
        .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false }),
    ])

    if (accountError || devicesError) {
      console.error('account-status query failed:', accountError || devicesError)
      return res.status(500).json({ error: 'Unable to load secure account status right now.' })
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email || '',
      },
      account: toAccountSummary(account),
      devices: (devices || []).map(toDeviceSummary),
      deviceLimit: SECURE_DEVICE_LIMIT,
      deviceReplacementCooldown: getDeviceReplacementCooldown(devices || []),
    })
  } catch (err) {
    console.error('account-status failed:', err)
    return res.status(500).json({ error: 'Unable to load secure account status right now.' })
  }
}
