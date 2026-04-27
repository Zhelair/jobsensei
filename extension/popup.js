const DEFAULT_APP_URL = 'https://jobsensei.app'

const elements = {
  company: document.getElementById('company'),
  role: document.getElementById('role'),
  url: document.getElementById('url'),
  jdText: document.getElementById('jdText'),
  status: document.getElementById('status'),
  sourceMeta: document.getElementById('sourceMeta'),
  lengthMeta: document.getElementById('lengthMeta'),
  refreshBtn: document.getElementById('refreshBtn'),
  sendBtn: document.getElementById('sendBtn'),
}

document.addEventListener('DOMContentLoaded', async () => {
  elements.jdText.addEventListener('input', updateMeta)
  elements.refreshBtn.addEventListener('click', captureCurrentPage)
  elements.sendBtn.addEventListener('click', handoffCapture)

  await captureCurrentPage()
})

async function captureCurrentPage() {
  setStatus('Reading the current page...')

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('No active tab available.')

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobFromPage,
    })

    const payload = result?.result
    if (!payload) throw new Error('Could not read the current page.')

    elements.company.value = payload.company || ''
    elements.role.value = payload.role || ''
    elements.url.value = payload.url || tab.url || ''
    elements.jdText.value = payload.jdText || ''
    elements.sourceMeta.textContent = `Source: ${payload.pageTitle || 'current page'}`
    updateMeta()

    setStatus('Capture refreshed. Review details before sending.', 'success')
  } catch (error) {
    setStatus(error.message || 'Could not capture the current page.', 'error')
  }
}

async function handoffCapture() {
  const payload = getFormPayload()

  if (!hasPayloadDetails(payload)) {
    setStatus('Add at least one job detail before sending it to JobSensei.', 'error')
    return
  }

  await sendToJobSensei(payload)
}

function getFormPayload() {
  return {
    company: elements.company.value.trim(),
    role: elements.role.value.trim(),
    url: elements.url.value.trim(),
    jdText: elements.jdText.value.trim(),
    source: 'chrome-extension',
    capturedAt: new Date().toISOString(),
  }
}

function hasPayloadDetails(payload) {
  return !!(payload.url || payload.jdText || payload.company || payload.role)
}

async function sendToJobSensei(payload) {
  setStatus('Opening JobSensei...')

  chrome.runtime.sendMessage({ type: 'handoff-capture', payload, appUrl: DEFAULT_APP_URL }, response => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, 'error')
      return
    }

    if (!response?.ok) {
      setStatus(response?.error || 'Could not deliver the capture to JobSensei.', 'error')
      return
    }

    setStatus('Sent to JobSensei.', 'success')
    window.close()
  })
}

function updateMeta() {
  elements.lengthMeta.textContent = `JD: ${elements.jdText.value.trim().length} chars`
}

function setStatus(message, tone = '') {
  elements.status.textContent = message
  elements.status.className = `status ${tone}`.trim()
}

function extractJobFromPage() {
  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim()
  }

  function cleanLines(value) {
    return (value || '')
      .split(/\r?\n/)
      .map(cleanText)
      .filter(Boolean)
  }

  function isVisible(node) {
    const rect = node.getBoundingClientRect?.()
    const style = window.getComputedStyle?.(node)
    return !!rect && rect.width > 0 && rect.height > 0 && style?.visibility !== 'hidden' && style?.display !== 'none'
  }

  function isGenericTitle(value) {
    return /^(careers?|jobs?|job openings?|open positions?|application|overview|for you|all jobs)$/i.test(cleanText(value))
  }

  function isBadRoleCandidate(value) {
    return /bookmark|message|menu|share|more_vert|subscribe|newsletter|apply|report|получавайте|всички обяви|за нас|кандидатствай|разглеждания|съобщения|бележник/i.test(cleanText(value))
  }

  function collectTextsFromSelectors(selectors) {
    const texts = []
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector))
      for (const node of nodes) {
        if (!isVisible(node)) continue
        const text = cleanText(node.innerText || node.textContent || '')
        if (text.length >= 3) texts.push(text)
      }
    }
    return texts
  }

  function scoreRoleCandidate(value) {
    const text = cleanText(value)
    if (!text || text.length < 4 || text.length > 120 || isGenericTitle(text) || isBadRoleCandidate(text)) return -100
    let score = 0
    if (/analyst|expert|engineer|developer|manager|specialist|designer|consultant|director|lead|associate|coordinator|officer|architect|scientist|administrator|accountant|recruiter|intern|payments?|kyc|aml|risk|fraud|compliance/i.test(text)) score += 8
    if (/&|\/|\b[A-Z]{2,}\b/.test(text)) score += 2
    if (/remote|hybrid|sofia|bulgaria|fully/i.test(text)) score += 1
    if (text.split(/\s+/).length >= 2 && text.split(/\s+/).length <= 10) score += 2
    return score
  }

  function bestRoleCandidate(candidates) {
    return candidates
      .map(text => ({ text, score: scoreRoleCandidate(text) }))
      .filter(item => item.score > -100)
      .sort((a, b) => b.score - a.score)[0]?.text || ''
  }

  function roleFromPageTitle(title) {
    const parts = title
      .split(/\s+[|\-–—]\s+/)
      .map(cleanText)
      .filter(Boolean)
    const jobsBgPart = title.match(/jobs\.bg\s*-\s*([^,|–—]+)/i)?.[1]
    return bestRoleCandidate([jobsBgPart, ...parts])
  }

  function titleize(value) {
    return cleanText(value)
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector))
      for (const node of nodes) {
        if (!isVisible(node)) continue
        const text = cleanText(node.innerText || node.textContent || '')
        if (text.length >= 3 && !isGenericTitle(text)) return text
      }
    }
    return ''
  }

  function longestTextFromSelectors(selectors) {
    let longest = ''
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector))
      for (const node of nodes) {
        if (!isVisible(node)) continue
        const text = (node.innerText || node.textContent || '').trim()
        if (cleanText(text).length > cleanText(longest).length) longest = text
      }
    }
    return longest
  }

  const pageTitle = cleanText(document.title)
  const titleParts = pageTitle.split(/\s+[|\-–—]\s+/).map(cleanText).filter(Boolean)
  const visibleLines = cleanLines(document.body?.innerText || '')
  const roleSelectors = [
    '[class*="jobs-unified-top-card__job-title" i]',
    '[data-testid*="job-title" i]',
    '[data-automation-id*="job-title" i]',
    '[class*="job-title" i]',
    '[class*="jobTitle" i]',
    'h1',
    'h2',
    '[data-testid*="title" i]',
    '[class*="headline" i]',
  ]
  const role = bestRoleCandidate([
    ...collectTextsFromSelectors(roleSelectors),
    roleFromPageTitle(pageTitle),
    ...titleParts,
    ...visibleLines.slice(0, 40),
  ])

  const companySelectors = [
    '[class*="jobs-unified-top-card__company-name" i]',
    '[data-testid*="company" i]',
    '[data-automation-id*="company" i]',
    '[class*="company" i]',
    '[class*="employer" i]',
    '[data-company]'
  ]

  const metaCompany = cleanText(document.querySelector('meta[property="og:site_name"]')?.content || '')
  const hostname = window.location.hostname.replace(/^www\./i, '')
  const hostFallback = titleize(hostname.split('.')[0].replace(/[-_]+/g, ' '))
  const jobsBgCompany = /jobs\.bg/i.test(hostname)
    ? cleanText(pageTitle.match(/\s(?:от|from)\s([^|–—]+)/i)?.[1] || '')
    : ''
  let company = textFromSelectors(companySelectors) || jobsBgCompany || titleParts.find(part => part !== role && !isGenericTitle(part)) || metaCompany || hostFallback
  if (/linkedin/i.test(window.location.hostname) && company.includes('\n')) {
    company = cleanLines(company)[0] || company
  }

  const jdSelectors = [
    '[class*="jobs-description__content" i]',
    '[class*="jobs-box__html-content" i]',
    '[data-testid*="job-description" i]',
    '[data-automation-id*="job-description" i]',
    'main',
    'article',
    '[role="main"]',
    '.job-description',
    '#job-description',
    '[data-testid*="description" i]',
    '[class*="job-description" i]',
    '[class*="description" i]'
  ]

  let jdText = longestTextFromSelectors(jdSelectors)
  if (cleanText(jdText).length < 400) {
    jdText = (document.body?.innerText || '').slice(0, 12000)
  }
  jdText = cleanLines(jdText)
    .filter(line => !/bookmark|message|menu|share|more_vert|разглеждания|кандидатствай|получавайте|съобщения|бележник|всички обяви/i.test(line))
    .join(' ')
    .slice(0, 12000)

  return {
    company,
    role,
    jdText,
    url: window.location.href,
    pageTitle,
    source: 'chrome-extension',
  }
}
