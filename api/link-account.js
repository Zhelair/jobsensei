import {
  ACTIVE_PLAN_STATUSES,
  SECURE_DEVICE_LIMIT,
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  getRequestDeviceId,
  hashValue,
  setDefaultCorsHeaders,
  verifyLegacyAccessToken,
} from './_lib/authBridge.js'

function normalizeDeviceName(value) {
  return String(value || '').trim().slice(0, 80)
}

function normalizeDeviceLabel(value) {
  return String(value || '').trim().slice(0, 120)
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
  setDefaultCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { user, error } = await authenticateSupabaseUser(req)
  if (!user) return res.status(401).json({ error })

  const body = req.body || {}
  const deviceId = getRequestDeviceId(req)
  const deviceName = normalizeDeviceName(body.deviceName)
  const deviceLabel = normalizeDeviceLabel(body.deviceLabel)
  const legacyToken = String(body.legacyToken || '')
  const legacyCode = String(body.legacyCode || '').trim().toLowerCase()

  if (!deviceId) {
    return res.status(400).json({ error: 'A device id is required to link secure access.' })
  }

  const legacyPayload = legacyToken ? verifyLegacyAccessToken(legacyToken) : null
  const linkedCode = legacyPayload?.code || legacyCode

  if (!linkedCode) {
    return res.status(400).json({ error: 'A current JobSensei access token or access code is required before linking.' })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data: existingDevices, error: devicesError } = await supabase
      .from('device_registrations')
      .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at')
      .eq('user_id', user.id)

    if (devicesError) {
      console.error('link-account devices lookup failed:', devicesError)
      return res.status(500).json({ error: 'Unable to verify device registrations right now.' })
    }

    const approvedDevices = (existingDevices || []).filter(device => !device.revoked_at)
    const matchingDevice = approvedDevices.find(device => device.device_id === deviceId)

    if (!matchingDevice && approvedDevices.length >= SECURE_DEVICE_LIMIT) {
      return res.status(409).json({
        error: `This account already has ${SECURE_DEVICE_LIMIT} approved devices. Revoke one before linking a new browser.`,
      })
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        email: user.email || '',
        plan_status: 'active',
        plan_source: 'legacy_bridge',
        legacy_code_hash: hashValue(linkedCode),
        linked_at: now,
        updated_at: now,
      }, { onConflict: 'user_id' })
      .select('email, plan_status, plan_source, linked_at')
      .single()

    if (accountError) {
      console.error('link-account account upsert failed:', accountError)
      return res.status(500).json({ error: 'Unable to link this access right now.' })
    }

    const { data: device, error: deviceError } = await supabase
      .from('device_registrations')
      .upsert({
        user_id: user.id,
        device_id: deviceId,
        device_name: deviceName || 'Browser device',
        device_label: deviceLabel || deviceName || 'Current browser',
        approved_at: matchingDevice?.approved_at || now,
        revoked_at: null,
        last_seen_at: now,
      }, { onConflict: 'user_id,device_id' })
      .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at')
      .single()

    if (deviceError) {
      console.error('link-account device upsert failed:', deviceError)
      return res.status(500).json({ error: 'Access linked, but the device could not be registered safely.' })
    }

    return res.status(200).json({
      account: {
        email: account.email,
        planStatus: account.plan_status,
        planSource: account.plan_source,
        linkedAt: account.linked_at,
        linked: Boolean(account.linked_at),
        planActive: ACTIVE_PLAN_STATUSES.has(account.plan_status),
      },
      device: toDeviceSummary(device),
      deviceLimit: SECURE_DEVICE_LIMIT,
    })
  } catch (err) {
    console.error('link-account failed:', err)
    return res.status(500).json({ error: 'Unable to link this access right now.' })
  }
}
