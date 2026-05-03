import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const LEGACY_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000

export const SECURE_DEVICE_LIMIT = 2
export const DEVICE_REPLACEMENT_COOLDOWN_MS = 48 * 60 * 60 * 1000
export const ACTIVE_PLAN_STATUSES = new Set(['active', 'grace'])

function getAllowedCorsOrigins() {
  const configuredOrigins = [
    process.env.ALLOWED_APP_ORIGINS,
    process.env.APP_ORIGIN,
    process.env.PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(','))
    .map(value => value.trim())
    .filter(Boolean)

  return new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...configuredOrigins,
  ])
}

export function setDefaultCorsHeaders(req, res) {
  const origin = req.headers.origin || req.headers.Origin || ''
  const allowedOrigins = getAllowedCorsOrigins()
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id')
}

export function readBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
}

export function looksLikeJwt(token = '') {
  return String(token).split('.').length === 3
}

export function hashValue(value = '') {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

export function getRequestDeviceId(req) {
  const headerValue = req.headers['x-device-id'] || req.headers['X-Device-Id']
  const bodyValue = req.body?.deviceId
  return String(headerValue || bodyValue || '').trim()
}

export function isLegacyAccessConfigured() {
  return Boolean(process.env.JWT_SECRET && process.env.ACCESS_CODES)
}

export function getLegacyAccessCodes() {
  return (process.env.ACCESS_CODES || '')
    .split(',')
    .map(code => code.trim().toLowerCase())
    .filter(Boolean)
}

export function isLegacyAccessCodeValid(code) {
  const normalizedCode = String(code || '').trim().toLowerCase()
  if (!normalizedCode) return false
  return getLegacyAccessCodes().includes(normalizedCode)
}

export function signLegacyAccessToken(payload, expiresInMs = LEGACY_TOKEN_TTL_MS) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required to sign legacy access tokens.')
  }

  const data = JSON.stringify({
    ...payload,
    exp: payload?.exp || Date.now() + expiresInMs,
  })
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET)
  hmac.update(data)
  const sig = hmac.digest('hex')

  return Buffer.from(JSON.stringify({ data, sig })).toString('base64')
}

export function verifyLegacyAccessToken(token) {
  if (!token || !process.env.JWT_SECRET) return null

  try {
    const { data, sig } = JSON.parse(Buffer.from(token, 'base64').toString())
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET)
    hmac.update(data)
    const expected = hmac.digest('hex')

    if (expected !== sig) return null

    const payload = JSON.parse(data)
    if (!payload?.exp || payload.exp < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
}

export function isSupabaseServerConfigured() {
  return Boolean(process.env.SUPABASE_URL && getSupabaseServiceRoleKey())
}

export function isSupabaseClientConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

export function createSupabaseAdminClient() {
  if (!isSupabaseServerConfigured()) {
    throw new Error('Supabase server configuration is incomplete.')
  }

  return createClient(process.env.SUPABASE_URL, getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function authenticateSupabaseUser(req) {
  if (!isSupabaseServerConfigured()) {
    return { user: null, error: 'Supabase auth is not configured on the server yet.' }
  }

  const token = readBearerToken(req)
  if (!token) {
    return { user: null, error: 'Authorization required.' }
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired session. Please sign in again.' }
  }

  return { user: data.user, token, error: null }
}

export function buildBridgeStatus() {
  const clientConfigured = isSupabaseClientConfigured()
  const serverConfigured = isSupabaseServerConfigured()
  const secureAccountsEnabled = clientConfigured && serverConfigured

  return {
    legacyAccessEnabled: isLegacyAccessConfigured(),
    secureAccountsEnabled,
    deviceLimit: SECURE_DEVICE_LIMIT,
    authMode: secureAccountsEnabled ? 'magic_link_optional' : 'legacy_only',
    supabase: secureAccountsEnabled
      ? {
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY,
        }
      : null,
  }
}

export function getDeviceReplacementCooldown(devices = [], nextDeviceId = '') {
  const now = Date.now()
  const recentRevocations = devices
    .filter(device => device?.revoked_at && device?.device_id !== nextDeviceId)
    .map(device => {
      const revokedAtMs = new Date(device.revoked_at).getTime()
      return Number.isFinite(revokedAtMs)
        ? {
            deviceId: device.device_id,
            revokedAt: device.revoked_at,
            cooldownEndsAt: new Date(revokedAtMs + DEVICE_REPLACEMENT_COOLDOWN_MS).toISOString(),
            remainingMs: revokedAtMs + DEVICE_REPLACEMENT_COOLDOWN_MS - now,
          }
        : null
    })
    .filter(Boolean)
    .filter(device => device.remainingMs > 0)
    .sort((a, b) => b.remainingMs - a.remainingMs)

  if (!recentRevocations.length) return null

  const nextEligibleAt = recentRevocations
    .map(device => device.cooldownEndsAt)
    .sort()[0]
  const remainingMs = new Date(nextEligibleAt).getTime() - now

  return {
    active: remainingMs > 0,
    endsAt: nextEligibleAt,
    remainingMs,
    remainingHours: Math.ceil(remainingMs / (60 * 60 * 1000)),
  }
}

export async function logSecureAuditEvent({ userId, deviceId = null, action, metadata = {} }) {
  if (!userId || !action || !isSupabaseServerConfigured()) return

  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('account_audit_events').insert({
      user_id: userId,
      device_id: deviceId,
      action,
      metadata,
    })
  } catch (err) {
    console.error('audit log failed:', err)
  }
}
