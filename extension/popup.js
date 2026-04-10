const DEFAULT_APP_URL = 'https://jobsensei.app'

const elements = {
  appUrl: document.getElementById('appUrl'),
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
  const { appUrl = DEFAULT_APP_URL } = await chrome.storage.local.get({ appUrl: DEFAULT_APP_URL })
  elements.appUrl.value = appUrl
  elements.appUrl.addEventListener('change', persistAppUrl)
  elements.appUrl.addEventListener('blur', persistAppUrl)
  elements.jdText.addEventListener('input', updateMeta)
  elements.refreshBtn.addEventListener('click', captureCurrentPage)
  elements.sendBtn.addEventListener('click', handoffCapture)

  await captureCurrentPage()
})

async function persistAppUrl() {
  const value = elements.appUrl.value.trim() || DEFAULT_APP_URL
  await chrome.storage.local.set({ appUrl: value })
}

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

    setStatus('Capture refreshed.', 'success')
  } catch (error) {
    setStatus(error.message || 'Could not capture the current page.', 'error')
  }
}

async function handoffCapture() {
  const payload = {
    company: elements.company.value.trim(),
    role: elements.role.value.trim(),
    url: elements.url.value.trim(),
    jdText: elements.jdText.value.trim(),
    source: 'chrome-extension',
    capturedAt: new Date().toISOString(),
  }

  if (!payload.url && !payload.jdText && !payload.company && !payload.role) {
    setStatus('Add at least one job detail before sending it to JobSensei.', 'error')
    return
  }

  const appUrl = elements.appUrl.value.trim() || DEFAULT_APP_URL
  await chrome.storage.local.set({ appUrl })

  setStatus('Opening JobSensei...')

  chrome.runtime.sendMessage({ type: 'handoff-capture', payload, appUrl }, response => {
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
        const text = cleanText(node.innerText || node.textContent || '')
        if (text.length >= 3) return text
      }
    }
    return ''
  }

  function longestTextFromSelectors(selectors) {
    let longest = ''
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector))
      for (const node of nodes) {
        const text = cleanText(node.innerText || node.textContent || '')
        if (text.length > longest.length) longest = text
      }
    }
    return longest
  }

  const pageTitle = cleanText(document.title)
  const titleParts = pageTitle.split(/\s+[|\-–—]\s+/).map(cleanText).filter(Boolean)
  const h1Text = textFromSelectors(['h1', '[data-testid*="title" i]', '[class*="job-title" i]', '[class*="headline" i]'])
  const role = h1Text || titleParts[0] || ''

  const companySelectors = [
    '[data-testid*="company" i]',
    '[class*="company" i]',
    '[class*="employer" i]',
    '[data-company]'
  ]

  const metaCompany = cleanText(document.querySelector('meta[property="og:site_name"]')?.content || '')
  const hostname = window.location.hostname.replace(/^www\./i, '')
  const hostFallback = titleize(hostname.split('.')[0].replace(/[-_]+/g, ' '))
  const company = textFromSelectors(companySelectors) || titleParts[1] || metaCompany || hostFallback

  const jdSelectors = [
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
  if (jdText.length < 400) {
    jdText = cleanText(document.body?.innerText || '').slice(0, 12000)
  }

  return {
    company,
    role,
    jdText,
    url: window.location.href,
    pageTitle,
    source: 'chrome-extension',
  }
}
