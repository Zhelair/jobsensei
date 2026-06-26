export const BMAC_PRO_URL = 'https://buymeacoffee.com/niksales73l/e/515014'
export const LEMONSQUEEZY_ENABLED = String(import.meta.env.VITE_LEMONSQUEEZY_ENABLED || '').trim().toLowerCase() === 'true'

export async function createLemonSqueezyCheckout({
  email = '',
  name = '',
  variantId = '',
  locale = '',
  redirectUrl = '',
  userId = '',
  customData = {},
} = {}) {
  const res = await fetch('/api/lemonsqueezy-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      name,
      variantId,
      locale,
      redirectUrl,
      userId,
      customData,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || 'Unable to create Lemon Squeezy checkout.')
  }

  return data
}
