import {
  authenticateSupabaseUser,
  createSupabaseAdminClient,
  getRequestDeviceId,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

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
  const targetDeviceId = String(body.deviceId || '').trim()
  const currentDeviceId = getRequestDeviceId(req)

  if (!targetDeviceId) {
    return res.status(400).json({ error: 'A device id is required.' })
  }

  if (targetDeviceId === currentDeviceId) {
    return res.status(400).json({ error: 'Revoke this device from another approved device instead.' })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const now = new Date().toISOString()

    const { data: targetDevice, error: targetDeviceError } = await supabase
      .from('device_registrations')
      .select('id, user_id, device_id, revoked_at')
      .eq('user_id', user.id)
      .eq('device_id', targetDeviceId)
      .maybeSingle()

    if (targetDeviceError) {
      console.error('revoke-device lookup failed:', targetDeviceError)
      return res.status(500).json({ error: 'Unable to load the selected device right now.' })
    }

    if (!targetDevice) {
      return res.status(404).json({ error: 'That approved device could not be found.' })
    }

    if (targetDevice.revoked_at) {
      return res.status(400).json({ error: 'That device is already revoked.' })
    }

    const { error: updateError } = await supabase
      .from('device_registrations')
      .update({
        revoked_at: now,
        last_seen_at: now,
      })
      .eq('id', targetDevice.id)

    if (updateError) {
      console.error('revoke-device update failed:', updateError)
      return res.status(500).json({ error: 'Unable to revoke that device right now.' })
    }

    const { data: devices, error: devicesError } = await supabase
      .from('device_registrations')
      .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })

    if (devicesError) {
      console.error('revoke-device refresh failed:', devicesError)
      return res.status(500).json({ error: 'Device revoked, but the refreshed list could not be loaded.' })
    }

    return res.status(200).json({
      devices: (devices || []).map(toDeviceSummary),
    })
  } catch (err) {
    console.error('revoke-device failed:', err)
    return res.status(500).json({ error: 'Unable to revoke that device right now.' })
  }
}
