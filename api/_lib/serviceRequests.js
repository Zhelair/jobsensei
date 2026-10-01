import { createSupabaseAdminClient, hashValue } from './authBridge.js'

export async function reserveServiceRequest(req, user, kind, requestId, content) {
  if (!process.env.SERVICE_RATE_SALT) throw new Error('Service limits are not configured')
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
  const { data, error } = await createSupabaseAdminClient().rpc('reserve_service_request', {
    p_request_id: requestId, p_kind: kind, p_user_id: user.id,
    p_ip_hash: hashValue(`${process.env.SERVICE_RATE_SALT}:${ip}`),
    p_content_hash: hashValue(`${process.env.SERVICE_RATE_SALT}:${user.id}:${content}`),
  })
  if (error) throw new Error('Service limits unavailable')
  return data
}

export async function finishServiceRequest(requestId, status) {
  const { error } = await createSupabaseAdminClient().from('service_requests').update({ status }).eq('request_id', requestId)
  if (error) throw new Error('Unable to record service completion')
}
