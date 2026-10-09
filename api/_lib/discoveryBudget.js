import crypto from 'node:crypto'
import { createSupabaseAdminClient } from './authBridge.js'

export async function reserveDiscovery(userId, preferences) {
  const supabase = createSupabaseAdminClient()
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(preferences)).digest('hex')
  const leaseId = crypto.randomUUID()
  const { data, error } = await supabase.rpc('reserve_discovery_search', {
    p_user_id: userId, p_fingerprint: fingerprint, p_lease_id: leaseId,
  })
  if (error) throw error
  return { ...data, async finish(result = null) {
    const { error: writeError } = await supabase.from('discovery_search_cache').update({
      result, checked_at: result?.checkedAt || null, lease_until: null,
    }).eq('user_id', userId).eq('fingerprint', fingerprint).eq('lease_id', leaseId)
    if (writeError) throw writeError
  } }
}
