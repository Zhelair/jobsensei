export function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

export function scoreColor(score) {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  return 'text-red-400'
}

export function scoreBg(score) {
  if (score >= 8) return 'bg-green-500/15 border-green-500/20 text-green-400'
  if (score >= 6) return 'bg-yellow-500/15 border-yellow-500/20 text-yellow-400'
  return 'bg-red-500/15 border-red-500/20 text-red-400'
}

export function matchColor(score) {
  if (score >= 75) return '#22C55E'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

export function tryParseJSON(str) {
  try {
    // Remove markdown code blocks if present
    const cleaned = str.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}
