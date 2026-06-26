import {
  getLemonSqueezyCheckoutConfig,
  isLemonSqueezyCheckoutConfigured,
  setDefaultCorsHeaders,
} from './_lib/authBridge.js'

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1/checkouts'
const SUPPORTED_LOCALES = new Set([
  'bg', 'hr', 'cs', 'da', 'nl', 'en', 'et', 'fil', 'fi', 'fr', 'de', 'el', 'hu', 'id',
  'it', 'ja', 'ko', 'lv', 'lt', 'ms', 'mt', 'pl', 'pt', 'ro', 'ru', 'zh-CN', 'sk',
  'sl', 'es', 'sv', 'th', 'tr', 'vi',
])

function firstNonEmpty(...values) {
  return values
    .map(value => (value == null ? '' : String(value).trim()))
    .find(Boolean) || ''
}

function sanitizeEmail(value = '') {
  const email = String(value || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function sanitizeLocale(value = '') {
  const locale = String(value || '').trim()
  return SUPPORTED_LOCALES.has(locale) ? locale : ''
}

function sanitizeCustomData(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}

  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
      .map(([key, value]) => [String(key).slice(0, 80), value]),
  )
}

function resolveVariantId(requestedVariantId, config) {
  const requested = String(requestedVariantId || '').trim()
  const fallback = String(config.defaultVariantId || '').trim()
  const allowed = new Set((config.allowedIdentifiers || []).map(value => String(value).trim().toLowerCase()))

  if (!requested) return fallback
  if (!allowed.size) return requested
  if (allowed.has(requested.toLowerCase())) return requested
  return ''
}

export default async function handler(req, res) {
  setDefaultCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isLemonSqueezyCheckoutConfigured()) {
    return res.status(503).json({ error: 'Lemon Squeezy checkout is not configured on this deployment yet.' })
  }

  const config = getLemonSqueezyCheckoutConfig()
  const body = req.body || {}
  const variantId = resolveVariantId(body.variantId, config)

  if (!variantId) {
    return res.status(403).json({ error: 'Requested Lemon Squeezy variant is not allowed for this deployment.' })
  }

  const email = sanitizeEmail(body.email)
  const name = firstNonEmpty(body.name)
  const locale = sanitizeLocale(body.locale)
  const redirectUrl = firstNonEmpty(
    body.redirectUrl,
    process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}/#settings` : '',
  )
  const customData = sanitizeCustomData(body.customData)

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          custom: {
            source: 'jobsensei_webapp',
            ...(firstNonEmpty(body.userId) ? { user_id: String(body.userId).trim() } : {}),
            ...customData,
          },
        },
        product_options: {
          enabled_variants: [Number.isFinite(Number(variantId)) ? Number(variantId) : variantId],
          ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
        },
        checkout_options: {
          ...(locale ? { locale } : {}),
        },
        test_mode: Boolean(config.checkoutTestMode),
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: String(config.storeId),
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: String(variantId),
          },
        },
      },
    },
  }

  try {
    const response = await fetch(LEMONSQUEEZY_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.errors?.[0]?.detail || data?.message || 'Unable to create Lemon Squeezy checkout.',
      })
    }

    return res.status(200).json({
      ok: true,
      checkoutId: data?.data?.id || null,
      url: data?.data?.attributes?.url || null,
      testMode: Boolean(data?.data?.attributes?.test_mode),
    })
  } catch (error) {
    console.error('lemonsqueezy checkout failed:', error)
    return res.status(500).json({ error: 'Unable to create the Lemon Squeezy checkout right now.' })
  }
}
