const DEFAULT_APP_URL = 'https://jobsensei.app/#applications'
const PENDING_SELECTION_KEY = 'jobsensei_pending_selection_capture_v1'
const PREFS_KEY = 'jobsensei_extension_prefs_v1'
const DEFAULT_PREFS = { theme: 'dark', visuals: false }
const THEME_ORDER = ['dark', 'daylight', 'myspace']
const THEME_META = {
  dark: {
    label: 'Dark',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>',
  },
  daylight: {
    label: 'Daylight',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>',
  },
  myspace: {
    label: 'Neon',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.93 2.74c.24-.99 1.9-.99 2.14 0l.52 2.14a3.4 3.4 0 0 0 2.53 2.53l2.14.52c.99.24.99 1.9 0 2.14l-2.14.52a3.4 3.4 0 0 0-2.53 2.53l-.52 2.14c-.24.99-1.9.99-2.14 0l-.52-2.14a3.4 3.4 0 0 0-2.53-2.53l-2.14-.52c-.99-.24-.99-1.9 0-2.14l2.14-.52a3.4 3.4 0 0 0 2.53-2.53l.52-2.14Z"></path><path d="M20 15v4"></path><path d="M22 17h-4"></path></svg>',
  },
}

const elements = {
  captureTab: document.getElementById('captureTab'),
  aboutTab: document.getElementById('aboutTab'),
  capturePanel: document.getElementById('capturePanel'),
  aboutPanel: document.getElementById('aboutPanel'),
  themeBtn: document.getElementById('themeBtn'),
  visualsBtn: document.getElementById('visualsBtn'),
  company: document.getElementById('company'),
  role: document.getElementById('role'),
  url: document.getElementById('url'),
  jdText: document.getElementById('jdText'),
  status: document.getElementById('status'),
  sourceMeta: document.getElementById('sourceMeta'),
  lengthMeta: document.getElementById('lengthMeta'),
  refreshBtn: document.getElementById('refreshBtn'),
  sendBtn: document.getElementById('sendBtn'),
  openAppBtn: document.getElementById('openAppBtn'),
  backToCaptureBtn: document.getElementById('backToCaptureBtn'),
}

let prefs = { ...DEFAULT_PREFS }
let currentCaptureMeta = {}

document.addEventListener('DOMContentLoaded', async () => {
  elements.captureTab.addEventListener('click', () => showPanel('capture'))
  elements.aboutTab.addEventListener('click', () => showPanel('about'))
  elements.backToCaptureBtn.addEventListener('click', () => showPanel('capture'))
  elements.openAppBtn.addEventListener('click', openJobSensei)
  elements.jdText.addEventListener('input', updateMeta)
  elements.refreshBtn.addEventListener('click', captureCurrentPage)
  elements.sendBtn.addEventListener('click', handoffCapture)
  elements.themeBtn.addEventListener('click', () => {
    const idx = THEME_ORDER.indexOf(prefs.theme)
    updatePrefs({ theme: THEME_ORDER[(idx + 1) % THEME_ORDER.length] })
  })
  elements.visualsBtn.addEventListener('click', () => updatePrefs({ visuals: !prefs.visuals }))

  await loadPrefs()

  const pendingSelection = await consumePendingSelectionCapture()
  if (pendingSelection) {
    await captureCurrentPage({
      jdOverride: pendingSelection.jdText,
      fallbackPayload: pendingSelection,
      statusMessage: 'Selected JD loaded. Review it, then send to JobSensei.',
    })
    return
  }

  await captureCurrentPage()
})

function showPanel(panel) {
  const isCapture = panel === 'capture'
  elements.captureTab.classList.toggle('active', isCapture)
  elements.aboutTab.classList.toggle('active', !isCapture)
  elements.capturePanel.classList.toggle('hidden', !isCapture)
  elements.aboutPanel.classList.toggle('hidden', isCapture)
}

async function loadPrefs() {
  const saved = await storageGet(PREFS_KEY)
  prefs = { ...DEFAULT_PREFS, ...(saved?.[PREFS_KEY] || {}) }
  if (prefs.theme === 'night') prefs.theme = 'dark'
  if (prefs.theme === 'neon') prefs.theme = 'myspace'
  if (!THEME_ORDER.includes(prefs.theme)) prefs.theme = DEFAULT_PREFS.theme
  applyPrefs()
}

async function updatePrefs(next) {
  prefs = { ...prefs, ...next }
  applyPrefs()
  await storageSet({ [PREFS_KEY]: prefs })
}

function applyPrefs() {
  document.documentElement.dataset.theme = prefs.theme || DEFAULT_PREFS.theme
  document.documentElement.dataset.visuals = prefs.visuals ? 'on' : 'off'
  elements.visualsBtn.classList.toggle('active', !!prefs.visuals)
  elements.visualsBtn.title = prefs.visuals ? 'Visuals ON - click to disable' : 'Visuals OFF - click to enable'
  elements.themeBtn.innerHTML = THEME_META[prefs.theme]?.icon || THEME_META.dark.icon
  elements.themeBtn.title = `Theme: ${THEME_META[prefs.theme]?.label || 'Dark'} - click to cycle`
}

function openJobSensei() {
  chrome.tabs.create({ url: DEFAULT_APP_URL })
  window.close()
}

async function consumePendingSelectionCapture() {
  const saved = await storageGet(PENDING_SELECTION_KEY)
  const payload = saved?.[PENDING_SELECTION_KEY] || null
  if (payload) await storageRemove(PENDING_SELECTION_KEY)
  return payload
}

async function captureCurrentPage(options = {}) {
  setStatus('Reading the current page...')
  const { jdOverride = '', fallbackPayload = null, statusMessage = 'Capture refreshed. Review details before sending.' } = options

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('No active tab available.')

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readJobPage,
    })

    const payload = result?.result
    if (!payload) throw new Error('Could not read the current page.')

    fillForm({
      ...payload,
      url: payload.url || tab.url,
      jdText: jdOverride || payload.jdText,
      source: jdOverride ? 'chrome-extension-selection' : payload.source,
      jdOnly: !!jdOverride,
      capturedAt: fallbackPayload?.capturedAt,
    })
    setStatus(statusMessage, 'success')
  } catch (error) {
    if (fallbackPayload) {
      fillForm(fallbackPayload)
      setStatus(statusMessage, 'success')
      return
    }
    setStatus(error.message || 'Could not capture the current page.', 'error')
  }
}

function fillForm(payload) {
  elements.company.value = payload.company || ''
  elements.role.value = payload.role || ''
  elements.url.value = payload.url || ''
  elements.jdText.value = payload.jdText || ''
  currentCaptureMeta = {
    source: payload.source || 'chrome-extension',
    capturedAt: payload.capturedAt,
    jdOnly: !!payload.jdOnly,
  }
  const sourceLabel = payload.source === 'chrome-extension-selection'
    ? 'selected JD text'
    : (payload.pageTitle || 'current page')
  elements.sourceMeta.textContent = `Source: ${sourceLabel}`
  updateMeta()
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
    source: currentCaptureMeta.source || 'chrome-extension',
    capturedAt: currentCaptureMeta.capturedAt || new Date().toISOString(),
    jdOnly: !!currentCaptureMeta.jdOnly,
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

function storageGet(key) {
  return new Promise(resolve => chrome.storage.local.get(key, resolve))
}

function storageSet(value) {
  return new Promise(resolve => chrome.storage.local.set(value, resolve))
}

function storageRemove(key) {
  return new Promise(resolve => chrome.storage.local.remove(key, resolve))
}

function readJobPage(selectedText = '') {
  function cleanText(value) {
    return (value || '').replace(/\s+/g, ' ').trim()
  }

  function cleanLines(value) {
    return (value || '')
      .split(/\r?\n/)
      .map(cleanText)
      .filter(Boolean)
  }

  function uniqueLines(lines) {
    const seen = new Set()
    return lines.filter(line => {
      const key = line.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  function htmlToText(value) {
    const div = document.createElement('div')
    div.innerHTML = value || ''
    div.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
    div.querySelectorAll('p,li,h2,h3,h4').forEach(node => node.appendChild(document.createTextNode('\n')))
    return div.innerText || div.textContent || ''
  }

  function isVisible(node) {
    const rect = node.getBoundingClientRect?.()
    const style = window.getComputedStyle?.(node)
    return !!rect && rect.width > 0 && rect.height > 0 && style?.visibility !== 'hidden' && style?.display !== 'none'
  }

  function isGenericTitle(value) {
    return /^(careers?|jobs?|job openings?|open positions?|application|overview|for you|all jobs|job search|linkedin|jobs\.bg)$/i.test(cleanText(value))
  }

  function isBadRoleCandidate(value) {
    return /bookmark|message|menu|share|more_vert|subscribe|newsletter|apply|report|sign in|recommended|similar jobs|job alert/i.test(cleanText(value))
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
    if (/analyst|expert|engineer|developer|manager|specialist|designer|consultant|director|lead|associate|coordinator|officer|architect|scientist|administrator|accountant|recruiter|intern|payments?|kyc|aml|risk|fraud|compliance|product|operations|sales|marketing|finance|support/i.test(text)) score += 8
    if (/[\u0400-\u04FF]/.test(text) && text.split(/\s+/).length >= 2) score += 5
    if (/&|\/|\b[A-Z]{2,}\b/.test(text)) score += 2
    if (/remote|hybrid|sofia|bulgaria|fully/i.test(text)) score += 1
    if (text.split(/\s+/).length >= 2 && text.split(/\s+/).length <= 10) score += 2
    if (/[.!?]\s/.test(text)) score -= 5
    return score
  }

  function bestRoleCandidate(candidates) {
    return candidates
      .map(text => ({ text: cleanText(text), score: scoreRoleCandidate(text) }))
      .filter(item => item.text && item.score > -100)
      .sort((a, b) => b.score - a.score)[0]?.text || ''
  }

  function roleFromPageTitle(title) {
    const parts = splitTitle(title)
    const jobsBgPart = title.match(/jobs\.bg\s*-\s*([^,|\u2013\u2014]+)/i)?.[1]
    return bestRoleCandidate([jobsBgPart, ...parts])
  }

  function splitTitle(title) {
    return cleanText(title)
      .split(/\s+(?:[|\-]|\u2013|\u2014|\u00b7)\s+/)
      .map(cleanText)
      .filter(Boolean)
      .filter(part => !isGenericTitle(part))
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

  function metaContent(selectors) {
    for (const selector of selectors) {
      const value = cleanText(document.querySelector(selector)?.content || '')
      if (value) return value
    }
    return ''
  }

  function readJsonLdJobPosting() {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    const postings = []

    function visit(value) {
      if (!value) return
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }
      if (typeof value !== 'object') return
      if (Array.isArray(value['@graph'])) value['@graph'].forEach(visit)

      const type = value['@type']
      const types = Array.isArray(type) ? type : [type]
      if (types.some(item => String(item).toLowerCase() === 'jobposting')) {
        postings.push(value)
      }
    }

    for (const script of scripts) {
      try {
        visit(JSON.parse(script.textContent || '{}'))
      } catch {}
    }

    const posting = postings[0] || null
    if (!posting) return null
    const organization = posting.hiringOrganization || posting.organization || {}

    return {
      company: cleanText(typeof organization === 'string' ? organization : organization.name),
      role: cleanText(posting.title),
      jdText: cleanText(htmlToText(posting.description || '')),
    }
  }

  function collectNodesFromSelectors(selectors) {
    const nodes = []
    const seen = new Set()
    for (const selector of selectors) {
      for (const node of Array.from(document.querySelectorAll(selector))) {
        if (seen.has(node)) continue
        seen.add(node)
        nodes.push(node)
      }
    }
    return nodes
  }

  function scoreJdCandidate(text, node, selectorIndex = 0) {
    const compact = cleanText(text)
    if (compact.length < 220) return -100

    const lowered = compact.toLowerCase()
    const keywordMatches = (lowered.match(/responsibilities|requirements|qualifications|skills|experience|about the role|about you|what you will|what you'll|we offer|benefits|duties|knowledge|candidate|role|position|team|tasks|\u0438\u0437\u0438\u0441\u043a\u0432\u0430\u043d\u0438\u044f|\u043e\u0442\u0433\u043e\u0432\u043e\u0440\u043d\u043e\u0441\u0442\u0438|\u043a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438|\u0443\u043c\u0435\u043d\u0438\u044f|\u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u043c\u0435/gi) || []).length
    const noisyMatches = (lowered.match(/apply now|easy apply|sign in|create alert|recommended jobs|similar jobs|people also viewed|cookie|privacy policy|terms of use|save job|share this job|report this job/g) || []).length
    const lengthScore = Math.min(compact.length / 120, 55)
    const mainBoost = node?.closest?.('main, article, [role="main"]') ? 8 : 0
    const selectorBoost = Math.max(0, 20 - selectorIndex)

    return lengthScore + (keywordMatches * 8) + mainBoost + selectorBoost - (noisyMatches * 12) - (compact.length > 25000 ? 18 : 0)
  }

  function bestJdFromSelectors(selectors) {
    let best = { text: '', score: -100 }
    selectors.forEach((selector, index) => {
      for (const node of Array.from(document.querySelectorAll(selector))) {
        if (!isVisible(node)) continue
        const text = node.innerText || node.textContent || ''
        const score = scoreJdCandidate(text, node, index)
        if (score > best.score) best = { text, score }
      }
    })
    return best.text
  }

  function normalizeJdText(rawText) {
    const noiseLine = /^(apply|apply now|easy apply|save|saved|share|copy link|report|sign in|join now|follow|message|more|show more|show less|see more|job alert|recommended jobs|similar jobs|people also viewed|about linkedin|cookie|privacy policy|terms of use|back to jobs)$/i
    const lines = uniqueLines(cleanLines(rawText))
      .filter(line => line.length > 1)
      .filter(line => !noiseLine.test(line))
      .filter(line => !/^(bookmark|message|menu|share|more_vert)$/i.test(line))
      .filter(line => !/^\d+\s+(applicants?|views?)$/i.test(line))

    return lines.join('\n').slice(0, 12000)
  }

  function companyFromVisibleLines(lines, role) {
    const roleKey = cleanText(role).toLowerCase()
    const start = roleKey ? lines.findIndex(line => cleanText(line).toLowerCase() === roleKey) : -1
    const candidates = (start >= 0 ? lines.slice(start + 1, start + 8) : lines.slice(0, 30))
      .filter(line => line.length >= 2 && line.length <= 90)
      .filter(line => !isGenericTitle(line) && !isBadRoleCandidate(line))
      .filter(line => cleanText(line).toLowerCase() !== roleKey)
      .filter(line => !/^(remote|hybrid|on-site|full-time|part-time|contract|temporary|internship|\d+\s+applicants?)$/i.test(line))

    return candidates[0] || ''
  }

  const pageTitle = cleanText(document.title)
  const titleParts = splitTitle(pageTitle)
  const visibleLines = cleanLines(document.body?.innerText || '')
  const hostname = window.location.hostname.replace(/^www\./i, '')
  const hostFallback = titleize(hostname.split('.')[0].replace(/[-_]+/g, ' '))
  const jsonLd = readJsonLdJobPosting()

  const metaTitle = metaContent([
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
  ])

  const roleSelectors = [
    '[class*="jobs-unified-top-card__job-title" i]',
    '[class*="job-details-jobs-unified-top-card__job-title" i]',
    '[class*="topcard__title" i]',
    '[data-testid*="job-title" i]',
    '[data-automation-id*="job-title" i]',
    '[data-qa*="job-title" i]',
    '[itemprop="title"]',
    '[class*="job-title" i]',
    '[class*="jobTitle" i]',
    '[class*="position-title" i]',
    '[class*="vacancy-title" i]',
    'h1',
    'h2',
    '[data-testid*="title" i]',
    '[class*="headline" i]',
  ]

  const role = jsonLd?.role || bestRoleCandidate([
    ...collectTextsFromSelectors(roleSelectors),
    roleFromPageTitle(pageTitle),
    metaTitle,
    ...titleParts,
    ...visibleLines.slice(0, 45),
  ])

  const companySelectors = [
    '[class*="jobs-unified-top-card__company-name" i]',
    '[class*="job-details-jobs-unified-top-card__company-name" i]',
    '[class*="topcard__org-name" i]',
    '[class*="topcard__flavor" i]',
    '[data-testid*="company" i]',
    '[data-automation-id*="company" i]',
    '[data-qa*="company" i]',
    '[itemprop="hiringOrganization"]',
    '[itemprop="name"]',
    '[class*="company" i]',
    '[class*="employer" i]',
    '[class*="organization" i]',
    '[data-company]',
  ]

  const metaSiteName = metaContent([
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
  ])
  const jobsBgCompany = /jobs\.bg/i.test(hostname)
    ? cleanText(pageTitle.match(/\s(?:from|at)\s([^|\u2013\u2014]+)/i)?.[1] || '')
    : ''
  let company = jsonLd?.company
    || textFromSelectors(companySelectors)
    || jobsBgCompany
    || companyFromVisibleLines(visibleLines, role)
    || titleParts.find(part => part !== role && !/jobs\.bg|linkedin|careers?|job search/i.test(part))
    || (!/linkedin|jobs\.bg/i.test(hostname) ? metaSiteName : '')
    || hostFallback

  if (/linkedin/i.test(hostname) && company.includes('\n')) {
    company = cleanLines(company)[0] || company
  }

  const jdSelectors = [
    '#job-details',
    '[class*="jobs-description__content" i]',
    '[class*="jobs-box__html-content" i]',
    '[class*="jobs-description-content" i]',
    '[class*="show-more-less-html" i]',
    '[data-testid*="job-description" i]',
    '[data-automation-id*="job-description" i]',
    '[data-qa*="job-description" i]',
    '[itemprop="description"]',
    '.job-description',
    '#job-description',
    '[class*="job-description" i]',
    '[class*="jobDescription" i]',
    '[class*="vacancy-description" i]',
    '[class*="posting-description" i]',
    '[class*="description" i]',
    '[data-testid*="description" i]',
    'article',
    'main',
    '[role="main"]',
  ]

  let jdText = selectedText
  if (!jdText && cleanText(jsonLd?.jdText).length >= 350) jdText = jsonLd.jdText
  if (!jdText) jdText = bestJdFromSelectors(jdSelectors)
  if (cleanText(jdText).length < 400 && !selectedText) {
    const mainText = collectNodesFromSelectors(['main', 'article', '[role="main"]'])
      .map(node => node.innerText || node.textContent || '')
      .sort((a, b) => cleanText(b).length - cleanText(a).length)[0]
    jdText = mainText || document.body?.innerText || ''
  }
  jdText = normalizeJdText(jdText)

  return {
    company: cleanText(company),
    role: cleanText(role),
    jdText,
    url: window.location.href,
    pageTitle,
    source: selectedText ? 'chrome-extension-selection' : 'chrome-extension',
  }
}
