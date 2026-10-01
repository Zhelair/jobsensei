export async function fetchCompanyResearch(company, role, token) {
  if (!token) return { fallback: true, reason: 'sign_in_required' }
  try {
    const response = await fetch('/api/research', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ company, role }), signal: AbortSignal.timeout(20000),
    })
    const data = await response.json()
    if (!response.ok || data.fallback || !data.snippets) return { fallback: true, reason: data.reason || 'unavailable' }
    return { ...data, context: data.answer ? `Summary: ${data.answer}\n\n${data.snippets}` : data.snippets }
  } catch { return { fallback: true, reason: 'network_error' } }
}

export function researchNotice(reason) {
  if (reason === 'budget_reached') return 'JobSensei’s shared web-search allowance is unavailable for this month. This result uses AI background knowledge and may miss recent developments.'
  if (reason === 'provider_usage_limit') return 'Live web search has reached its provider usage limit. This result uses AI background knowledge and may miss recent developments.'
  if (reason === 'rate_limited') return 'Live web search is temporarily busy. Try again later. This result uses AI background knowledge.'
  if (reason === 'sign_in_required') return 'Sign in for live web research. This result uses AI background knowledge.'
  return 'Live web search was unavailable. This result uses AI background knowledge and may miss recent developments.'
}
