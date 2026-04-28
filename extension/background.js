const BRIDGE_KEY = 'jobsensei_extension_capture_v1'
const PENDING_SELECTION_KEY = 'jobsensei_pending_selection_capture_v1'
const SELECTION_MENU_ID = 'jobsensei-copy-jd-selection'

chrome.runtime.onInstalled.addListener(createContextMenus)
chrome.runtime.onStartup?.addListener(createContextMenus)

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== SELECTION_MENU_ID) return

  handleSelectionCapture(info, tab).catch(error => {
    console.error('JobSensei selection capture failed:', error)
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'handoff-capture') return undefined

  handleCaptureHandoff(message.payload, message.appUrl)
    .then(() => sendResponse({ ok: true }))
    .catch(error => sendResponse({ ok: false, error: error.message }))

  return true
})

async function handleCaptureHandoff(payload, appUrl) {
  const targetUrl = normalizeAppUrl(appUrl)
  let appTab = await findExistingAppTab(targetUrl)

  if (appTab) {
    appTab = await chrome.tabs.update(appTab.id, appTab.url === targetUrl ? { active: true } : { active: true, url: targetUrl })
  } else {
    appTab = await chrome.tabs.create({ url: targetUrl, active: true })
  }

  if (appTab.windowId) {
    await chrome.windows.update(appTab.windowId, { focused: true })
  }

  await waitForTabReady(appTab.id)

  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: appTab.id },
    func: deliverCaptureToPage,
    args: [BRIDGE_KEY, payload],
  })

  if (injection?.result?.error) {
    throw new Error(injection.result.error)
  }
}

function normalizeAppUrl(input) {
  const trimmed = (input || '').trim() || 'https://jobsensei.app'
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  const path = url.pathname === '/' ? '' : url.pathname
  return `${url.origin}${path}${url.hash || '#applications'}`
}

async function findExistingAppTab(targetUrl) {
  const origin = new URL(targetUrl).origin
  const tabs = await chrome.tabs.query({})
  return tabs.find(tab => tab.url && tab.url.startsWith(origin)) || null
}

function waitForTabReady(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(handleUpdated)
      reject(new Error('Timed out waiting for JobSensei to open.'))
    }, 15000)

    function handleUpdated(updatedTabId, info) {
      if (updatedTabId !== tabId || info.status !== 'complete') return
      clearTimeout(timeout)
      chrome.tabs.onUpdated.removeListener(handleUpdated)
      resolve()
    }

    chrome.tabs.get(tabId, tab => {
      if (chrome.runtime.lastError) {
        clearTimeout(timeout)
        chrome.tabs.onUpdated.removeListener(handleUpdated)
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (tab?.status === 'complete') {
        clearTimeout(timeout)
        resolve()
        return
      }

      chrome.tabs.onUpdated.addListener(handleUpdated)
    })
  })
}

function deliverCaptureToPage(storageKey, payload) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent('jobsensei-extension-capture', { detail: payload }))
    return { ok: true }
  } catch (error) {
    return { error: error.message }
  }
}

function createContextMenus() {
  chrome.contextMenus.remove(SELECTION_MENU_ID, () => {
    void chrome.runtime.lastError
    chrome.contextMenus.create({
      id: SELECTION_MENU_ID,
      title: '🥷 Copy selected JD to JobSensei',
      contexts: ['selection'],
    })
  })
}

async function handleSelectionCapture(info, tab) {
  if (!tab?.id) throw new Error('No active tab available.')
  const selectedText = (info.selectionText || '').trim()
  if (!selectedText) throw new Error('Select job description text first.')

  const payload = {
    company: '',
    role: '',
    url: tab.url || '',
    jdText: selectedText,
    pageTitle: tab.title || '',
    source: 'chrome-extension-selection',
    jdOnly: true,
  }

  await chrome.storage.local.set({
    [PENDING_SELECTION_KEY]: {
      ...payload,
      source: 'chrome-extension-selection',
      capturedAt: new Date().toISOString(),
    },
  })

  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true })
  }

  try {
    await chrome.action.openPopup()
  } catch {
    await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html'), active: true })
  }
}

function extractSelectionCaptureFromPage(selectedText) {
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

  function titleize(value) {
    return cleanText(value)
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  function collectTexts(selectors) {
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
    if (!text || text.length < 4 || text.length > 120 || isGenericTitle(text)) return -100
    if (/bookmark|message|menu|share|more_vert|subscribe|newsletter|apply|report/i.test(text)) return -100
    let score = 0
    if (/analyst|expert|engineer|developer|manager|specialist|designer|consultant|director|lead|associate|coordinator|officer|architect|scientist|administrator|accountant|recruiter|intern|payments?|kyc|aml|risk|fraud|compliance/i.test(text)) score += 8
    if (/&|\/|\b[A-Z]{2,}\b/.test(text)) score += 2
    if (text.split(/\s+/).length >= 2 && text.split(/\s+/).length <= 10) score += 2
    return score
  }

  function bestRoleCandidate(candidates) {
    return candidates
      .map(text => ({ text: cleanText(text), score: scoreRoleCandidate(text) }))
      .filter(item => item.text && item.score > -100)
      .sort((a, b) => b.score - a.score)[0]?.text || ''
  }

  function textFromSelectors(selectors) {
    for (const text of collectTexts(selectors)) {
      if (!isGenericTitle(text)) return text
    }
    return ''
  }

  const pageTitle = cleanText(document.title)
  const titleParts = pageTitle.split(/\s+[|\-–—]\s+/).map(cleanText).filter(Boolean)
  const visibleLines = cleanLines(document.body?.innerText || '')
  const role = bestRoleCandidate([
    ...collectTexts([
      '[data-testid*="job-title" i]',
      '[data-automation-id*="job-title" i]',
      '[class*="job-title" i]',
      '[class*="jobTitle" i]',
      'h1',
      'h2',
    ]),
    ...titleParts,
    ...visibleLines.slice(0, 35),
  ])

  const hostname = window.location.hostname.replace(/^www\./i, '')
  const hostFallback = titleize(hostname.split('.')[0].replace(/[-_]+/g, ' '))
  const company = textFromSelectors([
    '[data-testid*="company" i]',
    '[data-automation-id*="company" i]',
    '[class*="company" i]',
    '[class*="employer" i]',
    '[data-company]',
  ]) || titleParts.find(part => part !== role && !isGenericTitle(part)) || cleanText(document.querySelector('meta[property="og:site_name"]')?.content || '') || hostFallback

  return {
    company,
    role,
    jdText: cleanLines(selectedText).join(' ').slice(0, 12000),
    url: window.location.href,
    pageTitle,
    source: 'chrome-extension-selection',
  }
}
