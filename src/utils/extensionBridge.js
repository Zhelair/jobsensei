import { normalizeApplicationUrl } from './jobIntake'

export const EXTENSION_CAPTURE_KEY = 'jobsensei_extension_capture_v1'

export function normalizeExtensionCapture(payload = {}) {
  const url = normalizeApplicationUrl(payload.url || payload.jdUrl || '')
  const jdText = (payload.jdText || payload.jd || payload.description || '').trim()
  const company = (payload.company || '').trim()
  const role = (payload.role || '').trim()
  const pageTitle = (payload.pageTitle || payload.title || '').trim()

  if (!url && !jdText && !company && !role && !pageTitle) return null

  return {
    company,
    role,
    url: url || '',
    jdText,
    pageTitle,
    source: (payload.source || 'chrome-extension').trim(),
    capturedAt: payload.capturedAt || new Date().toISOString(),
  }
}

export function normalizeExtensionCaptures(payload = {}) {
  const rawCaptures = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.captures)
      ? payload.captures
      : [payload]

  const seen = new Set()
  return rawCaptures
    .map(normalizeExtensionCapture)
    .filter(Boolean)
    .filter(capture => {
      const key = `${capture.url || ''}:${capture.company || ''}:${capture.role || ''}:${capture.jdText.slice(0, 80)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function readExtensionCapture() {
  try {
    const raw = localStorage.getItem(EXTENSION_CAPTURE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const captures = normalizeExtensionCaptures(parsed)
    if (captures.length === 0) return null
    return captures.length === 1 ? captures[0] : { captures }
  } catch {
    return null
  }
}

export function clearExtensionCapture() {
  localStorage.removeItem(EXTENSION_CAPTURE_KEY)
}
