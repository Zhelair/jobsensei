import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const LEGACY_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000
const RESEND_API_URL = 'https://api.resend.com/emails'
export const MAX_APPROVED_DEVICES = 2
export const DEVICE_REPLACEMENT_COOLDOWN_MS = 8 * 60 * 60 * 1000
export const HOSTED_REQUEST_CREDITS = 31
export const FREE_MONTHLY_CREDITS = 531
export const PRO_MONTHLY_CREDITS = 53000
export const CREDIT_PERIOD_DAYS = 31

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

function getPrimaryGrant(activeGrants = []) {
  return [...activeGrants].sort((left, right) => {
    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
  })[0] || null
}

function derivePlanSourceFromGrant(grant) {
  const metadataSource = String(grant?.metadata?.planSource || grant?.metadata?.source || '').trim()
  return metadataSource || grant?.grant_type || 'payment_grant'
}

function derivePlanTierFromGrant(grant, fallbackTier = 'pro') {
  const explicitTier = String(
    grant?.metadata?.planTier
    || grant?.metadata?.tier
    || grant?.metadata?.plan_tier
    || '',
  ).trim().toLowerCase()

  if (explicitTier === 'free' || explicitTier === 'pro') return explicitTier

  const source = derivePlanSourceFromGrant(grant).toLowerCase()
  if (source.includes('free') || source.includes('trial')) return 'free'

  return fallbackTier
}

function getCreditAllowanceForPlanTier(planTier = 'pro') {
  return planTier === 'free' ? FREE_MONTHLY_CREDITS : PRO_MONTHLY_CREDITS
}

function addDaysToIso(value, days) {
  const next = new Date(value || Date.now())
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

function getCreditPeriodWindow({
  anchor,
  now = Date.now(),
  periodStart = null,
  periodEnd = null,
} = {}) {
  let start = periodStart ? new Date(periodStart).toISOString() : new Date(anchor || Date.now()).toISOString()
  let end = periodEnd ? new Date(periodEnd).toISOString() : addDaysToIso(start, CREDIT_PERIOD_DAYS)
  let reset = false

  while (new Date(end).getTime() <= now) {
    start = end
    end = addDaysToIso(start, CREDIT_PERIOD_DAYS)
    reset = true
  }

  return {
    creditPeriodStartedAt: start,
    creditPeriodEndsAt: end,
    reset,
  }
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

function sanitizeDeviceValue(value = '', { maxLength = 120 } = {}) {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)

  return normalized
}

function isLikelyDeviceId(value = '') {
  return /^[a-z0-9._:-]{12,128}$/i.test(String(value || '').trim())
}

function deviceRowIsApproved(row) {
  return Boolean(row?.approved_at && !row?.revoked_at)
}

function toIsoOrNull(value) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function getLatestReplacementCooldownUntil(rows = []) {
  return rows.reduce((latest, row) => {
    if (!row?.revoked_at) return latest
    const revokedAt = new Date(row.revoked_at).getTime()
    if (!Number.isFinite(revokedAt)) return latest
    const nextTimestamp = revokedAt + DEVICE_REPLACEMENT_COOLDOWN_MS
    if (nextTimestamp <= Date.now()) return latest
    return !latest || nextTimestamp > latest ? nextTimestamp : latest
  }, 0)
}

function compareDeviceRows(left, right, currentDeviceId = '') {
  const leftCurrent = left?.device_id === currentDeviceId ? 1 : 0
  const rightCurrent = right?.device_id === currentDeviceId ? 1 : 0
  if (leftCurrent !== rightCurrent) return rightCurrent - leftCurrent

  const leftApproved = deviceRowIsApproved(left) ? 1 : 0
  const rightApproved = deviceRowIsApproved(right) ? 1 : 0
  if (leftApproved !== rightApproved) return rightApproved - leftApproved

  const leftTime = new Date(
    left?.last_seen_at || left?.approved_at || left?.created_at || 0,
  ).getTime()
  const rightTime = new Date(
    right?.last_seen_at || right?.approved_at || right?.created_at || 0,
  ).getTime()

  return rightTime - leftTime
}

function formatSecureDeviceRow(row, currentDeviceId = '') {
  if (!row) return null

  const label = sanitizeDeviceValue(row.device_label, { maxLength: 80 })
  const fallbackName = sanitizeDeviceValue(row.device_name, { maxLength: 120 })

  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: fallbackName,
    deviceLabel: label,
    displayName: label || fallbackName || 'Unnamed device',
    approvedAt: toIsoOrNull(row.approved_at),
    revokedAt: toIsoOrNull(row.revoked_at),
    lastSeenAt: toIsoOrNull(row.last_seen_at),
    createdAt: toIsoOrNull(row.created_at),
    isApproved: deviceRowIsApproved(row),
    isCurrent: row.device_id === currentDeviceId,
  }
}

export function readSecureDeviceContext(req) {
  const deviceId = sanitizeDeviceValue(
    req?.headers?.['x-jobsensei-device-id']
      || req?.headers?.['X-JobSensei-Device-Id']
      || req?.body?.deviceId
      || '',
    { maxLength: 128 },
  ).toLowerCase()
  const deviceName = sanitizeDeviceValue(
    req?.headers?.['x-jobsensei-device-name']
      || req?.headers?.['X-JobSensei-Device-Name']
      || req?.body?.deviceName
      || '',
    { maxLength: 120 },
  )
  const deviceLabel = sanitizeDeviceValue(
    req?.headers?.['x-jobsensei-device-label']
      || req?.headers?.['X-JobSensei-Device-Label']
      || req?.body?.deviceLabel
      || '',
    { maxLength: 80 },
  )

  return {
    deviceId: isLikelyDeviceId(deviceId) ? deviceId : '',
    deviceName,
    deviceLabel,
  }
}

export function setDefaultCorsHeaders(req, res) {
  const origin = req.headers.origin || req.headers.Origin || ''
  const allowedOrigins = getAllowedCorsOrigins()
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-JobSensei-Device-Id, X-JobSensei-Device-Name, X-JobSensei-Device-Label',
  )
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
    authMode: secureAccountsEnabled ? 'magic_link_optional' : 'legacy_only',
    supabase: secureAccountsEnabled
      ? {
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY,
        }
      : null,
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
    : 'Sign in to JobSensei'
  const intro = source === 'purchase_claim'
    ? 'Thanks for supporting JobSensei. Open the secure link below to claim your access on this email address.'
    : 'Use the secure link below to sign in to JobSensei without a password.'
  const text = `${headline}\n\n${intro}\n\nOpen JobSensei: ${magicLink}\n\nThis link is one-time and will stop working after it is used or expires.\n\nIf the button does not work, copy this link into your browser:\n${magicLink}\n\nRedirect: ${redirectTo}`

  const html = `
    <div style="margin:0;padding:32px 18px;background:#0f172a;color:#e2e8f0;font-family:'DM Sans',Arial,sans-serif;">
      <div style="max-width:580px;margin:0 auto;border-radius:24px;overflow:hidden;background:
        radial-gradient(circle at top left, rgba(45,212,191,0.14), transparent 34%),
        radial-gradient(circle at top right, rgba(99,102,241,0.12), transparent 32%),
        linear-gradient(180deg,#111827 0%,#0f172a 100%);
        border:1px solid #334155;
        box-shadow:0 24px 60px rgba(2,6,23,0.45);">
        <div style="height:4px;background:linear-gradient(90deg,#14b8a6 0%,#2dd4bf 55%,#6366f1 100%);"></div>
        <div style="padding:30px 30px 26px;">
          <div style="display:inline-block;margin-bottom:14px;padding:7px 11px;border-radius:999px;border:1px solid rgba(45,212,191,0.24);background:rgba(20,184,166,0.10);color:#5eead4;font-family:'Syne','Trebuchet MS',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">JobSensei</div>
          <div style="font-family:'Syne','Trebuchet MS',Arial,sans-serif;font-size:31px;line-height:1.12;font-weight:700;color:#f8fafc;margin:0 0 12px;">${headline}</div>
          <p style="font-size:15px;line-height:1.75;color:#cbd5e1;margin:0 0 24px;">${intro}</p>
          <p style="margin:0 0 22px;">
            <a href="${safeMagicLink}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#14b8a6;color:#082f49;text-decoration:none;font-family:'Syne','Trebuchet MS',Arial,sans-serif;font-size:15px;font-weight:700;box-shadow:0 12px 28px rgba(20,184,166,0.28);">Open JobSensei</a>
          </p>
          <div style="margin:0 0 20px;padding:15px 16px;border-radius:16px;border:1px solid rgba(45,212,191,0.18);background:rgba(15,23,42,0.72);">
            <p style="margin:0;font-size:12px;line-height:1.7;color:#dbeafe;">This link is one-time and will stop working after it is used or expires. If that happens, request a new sign-in link from the app.</p>
          </div>
          <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:0 0 10px;">If the button does not work, paste this link into your browser:</p>
          <p style="font-size:12px;line-height:1.8;word-break:break-all;margin:0 0 18px;">
            <a href="${safeMagicLink}" style="color:#5eead4;text-decoration:underline;">${safeMagicLink}</a>
          </p>
          <div style="padding-top:18px;border-top:1px solid rgba(51,65,85,0.9);font-size:12px;line-height:1.75;color:#64748b;">
            This email was sent to <span style="color:#cbd5e1;">${safeEmail}</span>.<br />
            After sign-in, JobSensei will return you to <span style="color:#cbd5e1;">${safeRedirectTo}</span>.
          </div>
        </div>
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

export async function ensureSecureAccountAccess({
  supabase,
  user,
}) {
  if (!supabase || !user?.id) {
    return {
      account: null,
      activeGrants: [],
      claimedGrantCount: 0,
    }
  }

  const now = new Date().toISOString()
  const userEmail = normalizeEmail(user.email)
  const [accountResponse, userGrantsResponse, claimableGrantsResponse] = await Promise.all([
    supabase
      .from('accounts')
      .select('email, plan_status, plan_source, plan_tier, linked_at, legacy_code_hash, credit_balance, credit_period_started_at, credit_period_ends_at, created_at')
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
    const planTier = derivePlanTierFromGrant(primaryGrant, account?.plan_tier || 'pro')
    const monthlyCreditAllowance = getCreditAllowanceForPlanTier(planTier)
    const planAnchor = primaryGrant.created_at || account?.linked_at || account?.created_at || now
    const tierChanged = account?.plan_tier && account.plan_tier !== planTier
    const nextWindow = getCreditPeriodWindow({
      anchor: planAnchor,
      now: Date.now(),
      periodStart: tierChanged ? planAnchor : (account?.credit_period_started_at || planAnchor),
      periodEnd: tierChanged ? addDaysToIso(planAnchor, CREDIT_PERIOD_DAYS) : account?.credit_period_ends_at,
    })
    const nextCreditBalance = tierChanged
      ? monthlyCreditAllowance
      : nextWindow.reset
        ? monthlyCreditAllowance
        : Number.isFinite(Number(account?.credit_balance))
          ? Math.max(0, Number(account.credit_balance))
          : monthlyCreditAllowance

    const { data: nextAccount, error: accountUpsertError } = await supabase
      .from('accounts')
      .upsert({
        user_id: user.id,
        email: user.email || account?.email || '',
        plan_status: 'active',
        plan_source: derivePlanSourceFromGrant(primaryGrant),
        plan_tier: planTier,
        legacy_code_hash: account?.legacy_code_hash || null,
        linked_at: account?.linked_at || now,
        credit_balance: nextCreditBalance,
        credit_period_started_at: nextWindow.creditPeriodStartedAt,
        credit_period_ends_at: nextWindow.creditPeriodEndsAt,
        updated_at: now,
      }, { onConflict: 'user_id' })
      .select('email, plan_status, plan_source, plan_tier, linked_at, legacy_code_hash, credit_balance, credit_period_started_at, credit_period_ends_at, created_at')
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
      .select('email, plan_status, plan_source, plan_tier, linked_at, legacy_code_hash, credit_balance, credit_period_started_at, credit_period_ends_at, created_at')
      .single()

    if (revokeAccountError) throw revokeAccountError
    account = revokedAccount
  }

  return {
    account,
    activeGrants,
    claimedGrantCount,
  }
}

export async function ensureSecureDeviceAccess({
  supabase,
  user,
  deviceId = '',
  deviceName = '',
  deviceLabel = '',
  autoApprove = false,
} = {}) {
  const normalizedDeviceId = sanitizeDeviceValue(deviceId, { maxLength: 128 }).toLowerCase()
  const normalizedDeviceName = sanitizeDeviceValue(deviceName, { maxLength: 120 })
  const normalizedDeviceLabel = sanitizeDeviceValue(deviceLabel, { maxLength: 80 })

  if (!supabase || !user?.id) {
    return {
      devices: [],
      approvedCount: 0,
      deviceLimit: MAX_APPROVED_DEVICES,
      currentDevice: null,
      currentDeviceApproved: false,
      currentDeviceMissing: !normalizedDeviceId,
      blockedReason: !normalizedDeviceId ? 'missing_device' : null,
      replacementCooldownUntil: null,
    }
  }

  const { data: rows, error } = await supabase
    .from('device_registrations')
    .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at, created_at')
    .eq('user_id', user.id)

  if (error) throw error

  const now = new Date().toISOString()
  let devices = [...(rows || [])]
  let currentRow = normalizedDeviceId
    ? devices.find(row => row.device_id === normalizedDeviceId) || null
    : null

  const refreshCurrentRow = nextRow => {
    currentRow = nextRow
    devices = devices
      .filter(row => row.device_id !== nextRow.device_id)
      .concat(nextRow)
  }

  const approvedDevices = devices.filter(deviceRowIsApproved)
  const replacementCooldownUntilMs = getLatestReplacementCooldownUntil(devices)
  const replacementCooldownUntil = replacementCooldownUntilMs
    ? new Date(replacementCooldownUntilMs).toISOString()
    : null

  let blockedReason = null

  if (normalizedDeviceId && currentRow && deviceRowIsApproved(currentRow)) {
    const shouldRefreshMetadata = (
      currentRow.device_name !== normalizedDeviceName
      || currentRow.device_label !== normalizedDeviceLabel
    )

    const { data: updatedRow, error: updateError } = await supabase
      .from('device_registrations')
      .update({
        device_name: shouldRefreshMetadata ? (normalizedDeviceName || currentRow.device_name || null) : currentRow.device_name || null,
        device_label: shouldRefreshMetadata ? (normalizedDeviceLabel || currentRow.device_label || null) : currentRow.device_label || null,
        last_seen_at: now,
      })
      .eq('id', currentRow.id)
      .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at, created_at')
      .single()

    if (updateError) throw updateError
    refreshCurrentRow(updatedRow)
  } else if (normalizedDeviceId && autoApprove) {
    const deviceSlotsOpen = approvedDevices.length < MAX_APPROVED_DEVICES
    const cooldownActive = Boolean(replacementCooldownUntilMs && replacementCooldownUntilMs > Date.now())

    if (currentRow && !deviceRowIsApproved(currentRow) && !currentRow.revoked_at) {
      blockedReason = 'device_not_approved'
    } else if (!deviceSlotsOpen) {
      blockedReason = 'limit_reached'
    } else if (cooldownActive) {
      blockedReason = 'cooldown_active'
    } else {
      const { data: upsertedRow, error: upsertError } = await supabase
        .from('device_registrations')
        .upsert({
          user_id: user.id,
          device_id: normalizedDeviceId,
          device_name: normalizedDeviceName || null,
          device_label: normalizedDeviceLabel || null,
          approved_at: now,
          revoked_at: null,
          last_seen_at: now,
        }, { onConflict: 'user_id,device_id' })
        .select('id, device_id, device_name, device_label, approved_at, revoked_at, last_seen_at, created_at')
        .single()

      if (upsertError) throw upsertError
      refreshCurrentRow(upsertedRow)
    }
  } else if (!normalizedDeviceId) {
    blockedReason = 'missing_device'
  } else if (!currentRow || !deviceRowIsApproved(currentRow)) {
    blockedReason = currentRow?.revoked_at ? 'device_revoked' : 'device_not_approved'
  }

  const sortedDevices = [...devices]
    .sort((left, right) => compareDeviceRows(left, right, normalizedDeviceId))
    .map(row => formatSecureDeviceRow(row, normalizedDeviceId))

  const formattedCurrentDevice = sortedDevices.find(row => row.isCurrent) || null
  const nextApprovedCount = sortedDevices.filter(row => row.isApproved).length

  return {
    devices: sortedDevices,
    approvedCount: nextApprovedCount,
    deviceLimit: MAX_APPROVED_DEVICES,
    currentDevice: formattedCurrentDevice,
    currentDeviceApproved: Boolean(formattedCurrentDevice?.isApproved),
    currentDeviceMissing: !normalizedDeviceId,
    blockedReason,
    replacementCooldownUntil,
  }
}

export async function consumeHostedCredits({
  supabase,
  userId,
  deviceId = '',
  route = 'proxy',
  provider = 'deepseek',
  model = 'deepseek-v4-flash',
  cost = HOSTED_REQUEST_CREDITS,
} = {}) {
  const { data, error } = await supabase.rpc('consume_hosted_credits', {
    p_user_id: userId,
    p_device_id: deviceId || null,
    p_route: route,
    p_provider: provider,
    p_model: model,
    p_cost: cost,
  })

  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export async function refundHostedCredits({
  supabase,
  userId,
  deviceId = '',
  route = 'proxy',
  provider = 'deepseek',
  model = 'deepseek-v4-flash',
  amount = HOSTED_REQUEST_CREDITS,
  reason = 'provider_error',
} = {}) {
  const { data, error } = await supabase.rpc('refund_hosted_credits', {
    p_user_id: userId,
    p_device_id: deviceId || null,
    p_route: route,
    p_provider: provider,
    p_model: model,
    p_amount: amount,
    p_reason: reason,
  })

  if (error) throw error
  return Array.isArray(data) ? data[0] : data
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
  void userId
  void deviceId
  void action
  void metadata
}
