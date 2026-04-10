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

export function readExtensionCapture() {
  try {
    const raw = localStorage.getItem(EXTENSION_CAPTURE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return normalizeExtensionCapture(parsed)
  } catch {
    return null
  }
}

export function clearExtensionCapture() {
  localStorage.removeItem(EXTENSION_CAPTURE_KEY)
}
