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

  function isVisible(node) {
    const rect = node.getBoundingClientRect?.()
    const style = window.getComputedStyle?.(node)
    return !!rect && rect.width > 0 && rect.height > 0 && style?.visibility !== 'hidden' && style?.display !== 'none'
  }

  function isGenericTitle(value) {
    return /^(careers?|jobs?|job openings?|open positions?|application|overview|for you|all jobs)$/i.test(cleanText(value))
  }

  function isBadRoleCandidate(value) {
    return /bookmark|message|menu|share|more_vert|subscribe|newsletter|apply|report/i.test(cleanText(value))
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
      .map(text => ({ text: cleanText(text), score: scoreRoleCandidate(text) }))
      .filter(item => item.text && item.score > -100)
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

  let jdText = selectedText || longestTextFromSelectors(jdSelectors)
  if (cleanText(jdText).length < 400 && !selectedText) {
    jdText = (document.body?.innerText || '').slice(0, 12000)
  }
  jdText = cleanLines(jdText)
    .filter(line => !/bookmark|message|menu|share|more_vert/i.test(line))
    .join(' ')
    .slice(0, 12000)

  return {
    company,
    role,
    jdText,
    url: window.location.href,
    pageTitle,
    source: selectedText ? 'chrome-extension-selection' : 'chrome-extension',
  }
}
