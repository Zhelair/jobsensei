export const AUTH_CALLBACK_KEYS = [
  'access_token',
  'refresh_token',
  'token_hash',
  'type',
  'error',
  'error_code',
  'error_description',
]

export const POST_AUTH_SECTION_STORAGE_KEY = 'js_post_auth_section'

export function normalizeRedirectUrl(value, baseOrigin = 'http://localhost') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed, baseOrigin)
    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

export function hasAuthCallbackParams(hash = '') {
  const normalizedHash = String(hash || '').startsWith('#')
    ? String(hash || '').slice(1)
    : String(hash || '')

  if (!normalizedHash) return false

  const params = new URLSearchParams(normalizedHash)
  return AUTH_CALLBACK_KEYS.some(key => params.has(key))
}

export function pickMagicLinkRedirectUrl({
  configuredUrl = '',
  currentUrl = '',
  baseOrigin = 'http://localhost',
} = {}) {
  const normalizedCurrentUrl = normalizeRedirectUrl(currentUrl, baseOrigin)
  if (normalizedCurrentUrl) return normalizedCurrentUrl

  return normalizeRedirectUrl(configuredUrl, baseOrigin)
}
