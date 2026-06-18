export const HOSTED_REQUEST_CREDITS = 31
export const FREE_MONTHLY_CREDITS = 531
export const PRO_MONTHLY_CREDITS = 53000
export const CREDIT_PERIOD_DAYS = 31

function toFiniteNumber(value) {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function addDays(value, days) {
  const base = value ? new Date(value) : new Date()
  base.setDate(base.getDate() + days)
  return base.toISOString()
}

function inferHostedTier({ secureAccount }) {
  if (!secureAccount?.planActive) return null

  const explicitTier = String(secureAccount?.planTier || '').toLowerCase()
  if (explicitTier === 'free' || explicitTier === 'pro') return explicitTier

  const source = String(secureAccount?.planSource || '').toLowerCase()
  if (source.includes('free') || source.includes('trial')) return 'free'

  return 'pro'
}

function getAllowanceForTier(tier) {
  return tier === 'free' ? FREE_MONTHLY_CREDITS : PRO_MONTHLY_CREDITS
}

export function getCreditSnapshot({ secureAccount, bmacToken, apiKey }) {
  void bmacToken

  if (apiKey) {
    return {
      mode: 'byok',
      tier: 'byok',
      monthlyCredits: null,
      requestCost: null,
      requestsIncluded: null,
      remainingCredits: null,
      remainingRequests: null,
      resetAt: null,
      balanceKnown: false,
      upgradeRecommended: false,
    }
  }

  const hostedTier = inferHostedTier({ secureAccount })
  if (!hostedTier) {
    return {
      mode: 'locked',
      tier: 'locked',
      monthlyCredits: null,
      requestCost: HOSTED_REQUEST_CREDITS,
      requestsIncluded: null,
      remainingCredits: null,
      remainingRequests: null,
      resetAt: null,
      balanceKnown: false,
      upgradeRecommended: true,
    }
  }

  const monthlyCredits = getAllowanceForTier(hostedTier)
  const requestsIncluded = Math.floor(monthlyCredits / HOSTED_REQUEST_CREDITS)
  const remainingCredits = toFiniteNumber(
    secureAccount?.creditsRemaining
    ?? secureAccount?.creditBalance
    ?? secureAccount?.monthlyCreditsRemaining,
  )
  const balanceKnown = remainingCredits != null
  const resetAt = secureAccount?.creditsResetAt
    || secureAccount?.creditPeriodEndsAt
    || secureAccount?.monthlyCreditsResetAt
    || addDays(secureAccount?.linkedAt, CREDIT_PERIOD_DAYS)

  return {
    mode: 'hosted',
    tier: hostedTier,
    monthlyCredits,
    requestCost: HOSTED_REQUEST_CREDITS,
    requestsIncluded,
    remainingCredits: balanceKnown ? Math.max(0, remainingCredits) : monthlyCredits,
    remainingRequests: balanceKnown ? Math.max(0, Math.floor(remainingCredits / HOSTED_REQUEST_CREDITS)) : requestsIncluded,
    resetAt,
    balanceKnown,
    upgradeRecommended: hostedTier !== 'pro',
  }
}
