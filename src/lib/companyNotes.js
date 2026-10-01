export const COMPANY_NOTE_FIELDS = ['people', 'theyMentioned', 'techStack', 'culture', 'openQ', 'prepNotes', 'wowFacts']

export function noteText(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join('\n')
  return ''
}

export function normalizeCompanyNotes(notes = {}) {
  return { ...notes, ...Object.fromEntries(COMPANY_NOTE_FIELDS.map(key => [key, noteText(notes?.[key])])) }
}

export function countCompanyNotes(notes) {
  return COMPANY_NOTE_FIELDS.filter(key => noteText(notes?.[key]).trim()).length
}
