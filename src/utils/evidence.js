// Only literal evidence is labelled verified. Semantic equivalence stays coaching,
// not proof of a qualification or experience.
export function normalizeEvidence(value) {
  return String(value || '').normalize('NFKC').toLowerCase()
    .replace(/power\s*bi/giu, 'powerbi')
    .replace(/[^\p{L}\p{N}+#]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function containsEvidence(source, phrase) {
  const needle = normalizeEvidence(phrase)
  return Boolean(needle) && ` ${normalizeEvidence(source)} `.includes(` ${needle} `)
}

export function reconcileKeywords(result, resume, jd) {
  const candidates = [...(result.keywordMatches || []), ...(result.missingKeywords || []), ...(result.keywordGaps || [])]
  const seen = new Set()
  const matched = [], missing = []
  for (const value of candidates) {
    if (typeof value !== 'string') continue
    const key = normalizeEvidence(value)
    // A model's general industry vocabulary is not a requirement of this JD.
    if (!key || seen.has(key) || !containsEvidence(jd, value)) continue
    seen.add(key)
    ;(containsEvidence(resume, value) ? matched : missing).push(value)
  }
  return { ...result, keywordMatches: matched, missingKeywords: missing, keywordGaps: missing }
}

export function verifyRequirementCoverage(items, resume, jd) {
  return (Array.isArray(items) ? items : []).filter(item =>
    item && typeof item.requirement === 'string' && containsEvidence(jd, item.requirement)
  ).map(item => {
    const verified = containsEvidence(resume, item.evidence)
    return { ...item, evidence: verified ? item.evidence : '', status: verified ? 'supported' : 'needs_confirmation',
      priority: typeof item.priority === 'string' ? item.priority : '',
      assessment: typeof item.assessment === 'string' ? item.assessment : '' }
  })
}

export function reconcileProfileKeywords(result, profile) {
  const keywords = result.sections?.keywords
  if (!keywords) return result
  const found = [], missing = [], seen = new Set()
  for (const term of [...(keywords.found || []), ...(keywords.missing || [])]) {
    if (typeof term !== 'string' || seen.has(normalizeEvidence(term))) continue
    seen.add(normalizeEvidence(term))
    if (containsEvidence(profile, term)) found.push(term)
    // Only retain explicit suggestions; unsupported 'found' terms are discarded.
    else if (keywords.missing?.includes(term)) missing.push(term)
  }
  return { ...result, sections: { ...result.sections, keywords: { found, missing } } }
}

export function groundResumeRewrites(result, resume) {
  const sourceNumbers = new Set(String(resume).match(/\d+(?:[.,]\d+)?%?/g) || [])
  return { ...result, redFlags: (Array.isArray(result.redFlags) ? result.redFlags : [])
    .filter(item => item && containsEvidence(resume, item.original))
    .map(item => {
      const unsupportedNumber = (String(item.fix || '').match(/\d+(?:[.,]\d+)?%?/g) || []).some(number => !sourceNumbers.has(number))
      return unsupportedNumber ? { ...item, fix: '', requiresConfirmation: true } : item
    }) }
}
