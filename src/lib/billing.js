const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'
const PADDLE_CLIENT_TOKEN = String(import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '').trim()
const PADDLE_ENV = String(import.meta.env.VITE_PADDLE_ENV || 'live').trim().toLowerCase() === 'sandbox'
  ? 'sandbox'
  : 'live'
const PADDLE_PRO_PRICE_ID = String(import.meta.env.VITE_PADDLE_PRO_PRICE_ID || '').trim()
const PADDLE_MANUAL_PRICING_URL = String(import.meta.env.VITE_PADDLE_MANUAL_PRICING_URL || '/pricing.html').trim() || '/pricing.html'
const PADDLE_SUCCESS_URL = String(import.meta.env.VITE_PADDLE_SUCCESS_URL || '').trim()
const DEFAULT_BMAC_SUPPORT_URL = 'https://buymeacoffee.com/niksales73l/e/515014'
const BMAC_SUPPORT_URL = String(import.meta.env.VITE_BMAC_SUPPORT_URL || DEFAULT_BMAC_SUPPORT_URL).trim()

export const PADDLE_ENABLED = Boolean(PADDLE_CLIENT_TOKEN && PADDLE_PRO_PRICE_ID)
export const BMAC_ENABLED = Boolean(BMAC_SUPPORT_URL)

let paddleLoadPromise = null
let paddleInitialized = false

function getSuccessUrl() {
  if (PADDLE_SUCCESS_URL) return PADDLE_SUCCESS_URL
  return `${window.location.origin}/#settings`
}

function loadPaddleScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (paddleLoadPromise) return paddleLoadPromise

  paddleLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PADDLE_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Paddle), { once: true })
      existing.addEventListener('error', () => reject(new Error('Unable to load Paddle.js.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = PADDLE_SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(window.Paddle)
    script.onerror = () => reject(new Error('Unable to load Paddle.js.'))
    document.head.appendChild(script)
  })

  return paddleLoadPromise
}

async function ensurePaddle() {
  if (!PADDLE_ENABLED) {
    throw new Error('Paddle checkout is not configured on this deployment yet.')
  }

  const Paddle = await loadPaddleScript()
  if (!Paddle) {
    throw new Error('Paddle.js is unavailable right now.')
  }

  if (!paddleInitialized) {
    if (PADDLE_ENV === 'sandbox' && Paddle.Environment?.set) {
      Paddle.Environment.set('sandbox')
    }

    if (Paddle.Initialize) {
      Paddle.Initialize({
        token: PADDLE_CLIENT_TOKEN,
      })
    }

    paddleInitialized = true
  }

  return Paddle
}

export function openPricingPage() {
  window.open(PADDLE_MANUAL_PRICING_URL, '_blank', 'noopener,noreferrer')
}

export function openBmacCheckout() {
  if (!BMAC_ENABLED) {
    throw new Error('Buy Me a Coffee checkout is not configured on this deployment yet.')
  }
  window.open(BMAC_SUPPORT_URL, '_blank', 'noopener,noreferrer')
}

export async function openProCheckout({
  email = '',
  userId = '',
  customData = {},
} = {}) {
  const normalizedEmail = String(email || '').trim()
  const normalizedUserId = String(userId || '').trim()

  if (!PADDLE_ENABLED) {
    openPricingPage()
    return { mode: 'pricing_fallback' }
  }

  const Paddle = await ensurePaddle()

  Paddle.Checkout.open({
    items: [
      {
        priceId: PADDLE_PRO_PRICE_ID,
        quantity: 1,
      },
    ],
    ...(normalizedEmail ? { customer: { email: normalizedEmail } } : {}),
    customData: {
      source: 'jobsensei_webapp',
      planTier: 'pro',
      ...(normalizedUserId ? { userId: normalizedUserId } : {}),
      ...customData,
    },
    settings: {
      successUrl: getSuccessUrl(),
    },
  })

  return { mode: 'checkout_opened' }
}
