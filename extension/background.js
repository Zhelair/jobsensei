const BRIDGE_KEY = 'jobsensei_extension_capture_v1'

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
