export function checkoutPolicy(env = process.env) {
  const environment = String(env.PADDLE_ENV || 'live').trim().toLowerCase()
  const production = env.VERCEL_ENV === 'production'
  if (!['sandbox', 'live'].includes(environment)) return { allowed: false, reason: 'Invalid billing environment.' }
  if (env.PADDLE_CHECKOUT_ENABLED !== 'true') return { allowed: false, reason: 'New subscriptions are not available yet. Existing account access is unchanged.' }
  if (production && environment !== 'live') return { allowed: false, reason: 'Test checkout is disabled on the public deployment.' }
  if (environment === 'live' && env.PADDLE_LIVE_APPROVED !== 'true') return { allowed: false, reason: 'New subscriptions are awaiting payment-provider approval.' }
  return { allowed: true, environment }
}

export function matchesPublicPrice(price) {
  return price?.status === 'active' && price.unit_price?.currency_code === 'EUR'
    && price.unit_price?.amount === '1000' && price.billing_cycle?.interval === 'month'
    && price.billing_cycle?.frequency === 1 && price.tax_mode === 'external'
    && !price.trial_period && !(price.unit_price_overrides?.length)
}
