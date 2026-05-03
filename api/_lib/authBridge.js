import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const LEGACY_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000
const RESEND_API_URL = 'https://api.resend.com/emails'

export const SECURE_DEVICE_LIMIT = 2
export const DEVICE_REPLACEMENT_COOLDOWN_MS = 48 * 60 * 60 * 1000
export const ACTIVE_PLAN_STATUSES = new Set(['active', 'grace'])

function getAllowedCorsOrigins() {
  const configuredOrigins = [
    process.env.ALLOWED_APP_ORIGINS,
    process.env.APP_ORIGIN,
    process.env.PUBLIC_APP_URL,
    process.env.VITE_SITE_URL,
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

function normalizeUrl(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

function firstNonEmpty(...values) {
  return values
    .map(value => (value == null ? '' : String(value).trim()))
    .find(Boolean) || ''
}

function escapeHtml(value = '') {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeDeviceName(value) {
  return String(value || '').trim().slice(0, 80)
}

function normalizeDeviceLabel(value) {
  return String(value || '').trim().slice(0, 120)
}

function getDeviceSummarySelect() {
  return 'id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at'
}

function mergeDeviceRecord(devices = [], nextDevice) {
  const filtered = devices.filter(device => device.id !== nextDevice.id)
  return [nextDevice, ...filtered].sort((a, b) => {
    const left = new Date(b.last_seen_at || 0).getTime()
    const right = new Date(a.last_seen_at || 0).getTime()
    return left - right
  })
}

function getPrimaryGrant(activeGrants = []) {
  return [...activeGrants].sort((left, right) => {
    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
  })[0] || null
}

function derivePlanSourceFromGrant(grant) {
  const metadataSource = String(grant?.metadata?.planSource || grant?.metadata?.source || '').trim()
  return metadataSource || grant?.grant_type || 'payment_grant'
}

function parseAllowedList(value = '') {
  return new Set(
    String(value || '')
      .split(',')
      .map(entry => entry.trim().toLowerCase())
      .filter(Boolean),
  )
}

function getAllowedBmacGrantIdentifiers() {
  return new Set([
    ...parseAllowedList(process.env.BMAC_ALLOWED_PRODUCT_IDS),
    ...parseAllowedList(process.env.BMAC_ALLOWED_PRODUCT_NAMES),
    ...parseAllowedList(process.env.BMAC_ALLOWED_MEMBERSHIP_LEVEL_IDS),
    ...parseAllowedList(process.env.BMAC_ALLOWED_MEMBERSHIP_LEVEL_NAMES),
  ])
}

function getBmacWebhookSecret() {
  return firstNonEmpty(
    process.env.BMAC_WEBHOOK_SECRET,
    process.env.BMAC_WEBHOOK_SIGNING_SECRET,
  )
}

function getAuthEmailSender() {
  return firstNonEmpty(process.env.AUTH_EMAIL_FROM, process.env.RESEND_FROM_EMAIL)
}

export function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase()
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

export function canSendCustomAuthEmails() {
  return Boolean(isSupabaseServerConfigured() && process.env.RESEND_API_KEY && getAuthEmailSender())
}

export function isBmacWebhookConfigured() {
  return Boolean(getBmacWebhookSecret())
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
    customAuthEmailsEnabled: canSendCustomAuthEmails(),
    bmacWebhookEnabled: isBmacWebhookConfigured(),
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

export function getPublicAppUrl(req = null) {
  const explicitUrl = normalizeUrl(
    firstNonEmpty(
      process.env.PUBLIC_APP_URL,
      process.env.APP_ORIGIN,
      process.env.VITE_SITE_URL,
    ),
  )
  if (explicitUrl) return explicitUrl

  const originHeader = normalizeUrl(req?.headers?.origin || req?.headers?.Origin || '')
  if (originHeader) return originHeader

  const nonLocalConfiguredOrigin = [...getAllowedCorsOrigins()].find(origin => {
    return !origin.includes('localhost') && !origin.includes('127.0.0.1')
  })
  if (nonLocalConfiguredOrigin) return normalizeUrl(nonLocalConfiguredOrigin)

  return 'http://localhost:5173/'
}

export function isAllowedRedirectUrl(value = '') {
  const normalized = normalizeUrl(value)
  if (!normalized) return false

  try {
    const candidate = new URL(normalized)
    return getAllowedCorsOrigins().has(candidate.origin) || normalizeUrl(getPublicAppUrl()) === normalized
  } catch {
    return false
  }
}

export function getMagicLinkRedirectUrl(value = '', req = null) {
  if (value && isAllowedRedirectUrl(value)) return normalizeUrl(value)
  return normalizeUrl(getPublicAppUrl(req))
}

export function getSecureSettingsUrl(req = null) {
  const base = getPublicAppUrl(req).replace(/\/$/, '')
  return `${base}/#settings`
}

export async function createMagicLinkForEmail({ email, redirectTo, data = {} }) {
  const supabase = createSupabaseAdminClient()
  const { data: response, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo,
      data,
    },
  })

  if (error || !response?.properties?.action_link) {
    throw error || new Error('Unable to create a magic link right now.')
  }

  return response.properties.action_link
}

export async function sendTransactionalEmail({ to, subject, html, text = '' }) {
  if (!canSendCustomAuthEmails()) {
    throw new Error('Custom auth email delivery is not configured yet.')
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getAuthEmailSender(),
      to: [to],
      subject,
      html,
      text,
    }),
  })

  if (response.ok) return response.json().catch(() => ({}))

  const payload = await response.json().catch(() => ({}))
  throw new Error(payload?.message || payload?.error || 'Unable to send the authentication email right now.')
}

export async function sendMagicLinkEmail({ email, magicLink, redirectTo, source = 'secure_sign_in' }) {
  const safeEmail = escapeHtml(email)
  const safeMagicLink = escapeHtml(magicLink)
  const safeRedirectTo = escapeHtml(redirectTo)
  const headline = source === 'purchase_claim'
    ? 'Your JobSensei access is ready'
    : 'Your JobSensei magic link'
  const intro = source === 'purchase_claim'
    ? 'Thanks for supporting JobSensei. Open the secure link below to claim your access on this email address.'
    : 'Use the secure link below to sign in to JobSensei without a password.'
  const text = `${headline}\n\n${intro}\n\nOpen JobSensei: ${magicLink}\n\nIf the button does not work, copy this link into your browser:\n${magicLink}\n\nRedirect: ${redirectTo}`

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #334155;border-radius:16px;padding:24px;">
        <div style="font-size:24px;font-weight:700;color:#f8fafc;margin-bottom:12px;">${headline}</div>
        <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">${intro}</p>
        <p style="margin:0 0 20px;">
          <a href="${safeMagicLink}" style="display:inline-block;background:#14b8a6;color:#082f49;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Open JobSensei</a>
        </p>
        <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:0 0 12px;">If the button does not work, paste this link into your browser:</p>
        <p style="font-size:12px;line-height:1.6;word-break:break-all;color:#67e8f9;margin:0 0 16px;">${safeMagicLink}</p>
        <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0;">This email was sent to ${safeEmail}. After sign-in, JobSensei will return you to ${safeRedirectTo}.</p>
      </div>
    </div>
  `

  return sendTransactionalEmail({
    to: email,
    subject: headline,
    html,
    text,
  })
}

export function getRawRequestBodyString(req) {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body)
  return ''
}

export function getBmacSignatureHeader(req) {
  return firstNonEmpty(
    req.headers['x-signature-sha256'],
    req.headers['X-Signature-Sha256'],
    req.headers['x-bmc-signature'],
    req.headers['X-Bmc-Signature'],
  )
}

export function verifyBmacWebhookSignature({ payload, signature, secret }) {
  if (!payload || !signature || !secret) return false

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const normalizedExpected = Buffer.from(expected.toLowerCase())
  const normalizedSignature = Buffer.from(String(signature).trim().toLowerCase())

  if (normalizedExpected.length !== normalizedSignature.length) return false
  return crypto.timingSafeEqual(normalizedExpected, normalizedSignature)
}

function extractBmacLifecycle(eventType = '', payload = {}) {
  const normalizedEvent = String(eventType || '').trim().toLowerCase()
  const normalizedStatus = String(
    payload.status ||
    payload.membership_status ||
    payload.subscription_status ||
    payload.payment_status ||
    '',
  ).trim().toLowerCase()

  const isRevoked = ['cancel', 'cancelled', 'canceled', 'refund', 'refunded', 'revoke', 'revoked', 'deleted']
    .some(keyword => normalizedEvent.includes(keyword) || normalizedStatus.includes(keyword))
  const isExpired = ['expire', 'expired', 'ended']
    .some(keyword => normalizedEvent.includes(keyword) || normalizedStatus.includes(keyword))

  if (isRevoked) return 'revoked'
  if (isExpired) return 'expired'
  return 'active'
}

function extractBmacIdentifiers(payload = {}) {
  return [
    payload.membership_level_id,
    payload.membership_level_name,
    payload.extra_id,
    payload.extra_title,
    payload.shop_item_id,
    payload.shop_item_name,
    payload.support_id,
    payload.support_title,
    payload.title,
    payload.tier_id,
    payload.tier_name,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
}

function isAllowedBmacGrant(identifiers = []) {
  const allowedIdentifiers = getAllowedBmacGrantIdentifiers()
  if (!allowedIdentifiers.size) return true

  return identifiers.some(identifier => allowedIdentifiers.has(identifier.toLowerCase()))
}

export function extractBmacGrantDetails(payload = {}, rawBody = '') {
  const envelope = payload?.data && typeof payload.data === 'object'
    ? payload.data
    : payload

  const eventType = firstNonEmpty(payload.event, payload.type, envelope.event, envelope.type).toLowerCase()
  const email = normalizeEmail(firstNonEmpty(
    envelope.supporter_email,
    envelope.email,
    envelope.member_email,
    payload.supporter_email,
    payload.email,
  ))
  const identifiers = extractBmacIdentifiers(envelope)
  const status = extractBmacLifecycle(eventType, envelope)
  const externalRef = firstNonEmpty(
    payload.id,
    payload.event_id,
    envelope.id,
    envelope.transaction_id,
    envelope.payment_id,
    envelope.membership_id,
    envelope.support_id,
    envelope.order_id,
  ) || hashValue(rawBody || JSON.stringify(payload))

  return {
    email,
    eventType,
    externalRef,
    identifiers,
    status,
    shouldGrantAccess: status === 'active' && isAllowedBmacGrant(identifiers),
    metadata: {
      source: 'bmac_webhook',
      eventType,
      supporterName: firstNonEmpty(envelope.supporter_name, envelope.name),
      amount: firstNonEmpty(envelope.amount, envelope.support_amount),
      currency: firstNonEmpty(envelope.currency, envelope.currency_code),
      identifiers,
      rawEvent: payload,
    },
  }
}

export async function ensureApprovedDeviceRegistration({
  supabase,
  userId,
  deviceId,
  deviceName = 'Browser device',
  deviceLabel = '',
  devices = [],
  now = new Date().toISOString(),
}) {
  if (!userId || !deviceId) {
    return { ok: false, reason: 'missing_device', message: 'A secure device id is required for account-based access.' }
  }

  const approvedDevices = devices.filter(device => !device.revoked_at)
  const matchingDevice = approvedDevices.find(device => device.device_id === deviceId)
  const priorDeviceRecord = devices.find(device => device.device_id === deviceId)
  const replacementCooldown = getDeviceReplacementCooldown(devices, deviceId)

  if (!matchingDevice && approvedDevices.length >= SECURE_DEVICE_LIMIT) {
    return {
      ok: false,
      reason: 'device_limit',
      message: `This account already has ${SECURE_DEVICE_LIMIT} approved devices. Revoke one from an approved device before adding this browser.`,
      limit: SECURE_DEVICE_LIMIT,
    }
  }

  if (!matchingDevice && !priorDeviceRecord && replacementCooldown?.active) {
    return {
      ok: false,
      reason: 'cooldown',
      message: `New-device approvals unlock on ${new Date(replacementCooldown.endsAt).toLocaleString()}.`,
      cooldown: replacementCooldown,
    }
  }

  const { data: device, error } = await supabase
    .from('device_registrations')
    .upsert({
      user_id: userId,
      device_id: deviceId,
      device_name: normalizeDeviceName(deviceName) || 'Browser device',
      device_label: normalizeDeviceLabel(deviceLabel) || normalizeDeviceName(deviceName) || 'Current browser',
      approved_at: matchingDevice?.approved_at || priorDeviceRecord?.approved_at || now,
      revoked_at: null,
      last_seen_at: now,
    }, { onConflict: 'user_id,device_id' })
    .select(getDeviceSummarySelect())
    .single()

  if (error) {
    throw error
  }

  return {
    ok: true,
    reason: matchingDevice ? 'existing_device' : 'approved_device',
    newlyApproved: !matchingDevice,
    device,
  }
}

export async function ensureSecureAccountAccess({
  supabase,
  user,
  deviceId = '',
  deviceName = 'Browser device',
  deviceLabel = '',
}) {
  if (!supabase || !user?.id) {
    return {
      account: null,
      devices: [],
      activeGrants: [],
      claimedGrantCount: 0,
      deviceApproval: null,
    }
  }

  const now = new Date().toISOString()
  const userEmail = normalizeEmail(user.email)
  const [accountResponse, userGrantsResponse, claimableGrantsResponse] = await Promise.all([
    supabase
      .from('accounts')
      .select('email, plan_status, plan_source, linked_at, legacy_code_hash')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('plan_grants')
      .select('id, grant_type, external_ref, status, claim_email, user_id, metadata, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    userEmail
      ? supabase
          .from('plan_grants')
          .select('id, grant_type, external_ref, status, claim_email, user_id, metadata, created_at')
          .is('user_id', null)
          .eq('claim_email', userEmail)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (accountResponse.error || userGrantsResponse.error || claimableGrantsResponse.error) {
    throw accountResponse.error || userGrantsResponse.error || claimableGrantsResponse.error
  }

  let account = accountResponse.data || null
  let activeGrants = [...(userGrantsResponse.data || [])]
  let claimedGrantCount = 0

  if ((claimableGrantsResponse.data || []).length) {
    const claimableGrantIds = claimableGrantsResponse.data.map(grant => grant.id)
    const { data: claimedGrants, error: claimError } = await supabase
      .from('plan_grants')
      .update({
        user_id: user.id,
        claimed_at: now,
        updated_at: now,
      })
      .in('id', claimableGrantIds)
      .select('id, grant_type, external_ref, status, claim_email, user_id, metadata, created_at')

    if (claimError) throw claimError

    claimedGrantCount = claimedGrants?.length || 0
    activeGrants = [...activeGrants, ...(claimedGrants || [])]

    await logSecureAuditEvent({
      userId: user.id,
      action: 'plan_grants_claimed',
      metadata: {
        count: claimedGrantCount,
        email: userEmail,
      },
    })
  }

  const primaryGrant = getPrimaryGrant(activeGrants)
  if (primaryGrant) {
    const { data: nextAccount, error: accountUpsertError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        email: user.email || account?.email || '',
        plan_status: 'active',
        plan_source: derivePlanSourceFromGrant(primaryGrant),
        legacy_code_hash: account?.legacy_code_hash || null,
        linked_at: account?.linked_at || now,
        updated_at: now,
      }, { onConflict: 'user_id' })
      .select('email, plan_status, plan_source, linked_at, legacy_code_hash')
      .single()

    if (accountUpsertError) throw accountUpsertError
    account = nextAccount
  } else if (account?.plan_source === 'bmac_webhook' && ACTIVE_PLAN_STATUSES.has(account.plan_status)) {
    const { data: revokedAccount, error: revokeAccountError } = await supabase
      .from('accounts')
      .update({
        email: user.email || account.email || '',
        plan_status: 'revoked',
        updated_at: now,
      })
      .eq('user_id', user.id)
      .select('email, plan_status, plan_source, linked_at, legacy_code_hash')
      .single()

    if (revokeAccountError) throw revokeAccountError
    account = revokedAccount
  }

  let devices = []
  let deviceApproval = null

  if (deviceId && account && ACTIVE_PLAN_STATUSES.has(account.plan_status)) {
    const { data: existingDevices, error: devicesError } = await supabase
      .from('device_registrations')
      .select(getDeviceSummarySelect())
      .eq('user_id', user.id)

    if (devicesError) throw devicesError

    devices = existingDevices || []
    deviceApproval = await ensureApprovedDeviceRegistration({
      supabase,
      userId: user.id,
      deviceId,
      deviceName,
      deviceLabel,
      devices,
      now,
    })

    if (deviceApproval.ok && deviceApproval.device) {
      devices = mergeDeviceRecord(devices, deviceApproval.device)
      if (deviceApproval.newlyApproved) {
        await logSecureAuditEvent({
          userId: user.id,
          deviceId,
          action: claimedGrantCount ? 'device_auto_approved_after_claim' : 'device_auto_approved',
          metadata: {
            deviceLabel: deviceApproval.device.device_label,
          },
        })
      }
    }
  }

  return {
    account,
    devices,
    activeGrants,
    claimedGrantCount,
    deviceApproval,
  }
}

export async function upsertBmacPlanGrant({
  supabase,
  email,
  externalRef,
  status,
  metadata,
}) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    throw new Error('BMAC webhook payload did not include a purchaser email.')
  }

  const now = new Date().toISOString()
  const { data: existingAccount, error: accountLookupError } = await supabase
    .from('accounts')
    .select('user_id, email')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (accountLookupError) throw accountLookupError

  const { data: existingGrant, error: existingGrantError } = await supabase
    .from('plan_grants')
    .select('id, status')
    .eq('grant_type', 'bmac_webhook')
    .eq('external_ref', externalRef)
    .maybeSingle()

  if (existingGrantError) throw existingGrantError

  const grantPayload = {
    user_id: existingAccount?.user_id || null,
    grant_type: 'bmac_webhook',
    external_ref: externalRef,
    claim_email: normalizedEmail,
    status,
    metadata,
    updated_at: now,
  }

  const { data: grant, error: grantError } = await supabase
    .from('plan_grants')
    .upsert(grantPayload, { onConflict: 'grant_type,external_ref' })
    .select('id, user_id, claim_email, status, metadata, created_at')
    .single()

  if (grantError) throw grantError

  if (existingAccount?.user_id) {
    await ensureSecureAccountAccess({
      supabase,
      user: {
        id: existingAccount.user_id,
        email: existingAccount.email || normalizedEmail,
      },
    })
  }

  return {
    grant,
    userId: existingAccount?.user_id || null,
    created: !existingGrant,
    statusChanged: existingGrant ? existingGrant.status !== grant.status : true,
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
