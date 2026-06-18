export const HOSTED_REQUEST_CREDITS = 31
export const FREE_MONTHLY_CREDITS = 531
export const PRO_MONTHLY_CREDITS = 53000

function toFiniteNumber(value) {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function inferHostedTier({ secureAccount, bmacToken }) {
  if (!secureAccount?.planActive && !bmacToken) return null

  const source = String(secureAccount?.planSource || '').toLowerCase()
  if (source.includes('free') || source.includes('trial')) return 'free'

  return 'pro'
}

function getDefaultResetDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
}

export function getCreditSnapshot({ secureAccount, bmacToken, apiKey }) {
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

  const hostedTier = inferHostedTier({ secureAccount, bmacToken })
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

  const monthlyCredits = hostedTier === 'free' ? FREE_MONTHLY_CREDITS : PRO_MONTHLY_CREDITS
  const requestsIncluded = Math.floor(monthlyCredits / HOSTED_REQUEST_CREDITS)

  const remainingCredits = toFiniteNumber(
    secureAccount?.creditsRemaining
    ?? secureAccount?.creditBalance
    ?? secureAccount?.monthlyCreditsRemaining,
  )
  const balanceKnown = remainingCredits != null

  return {
    mode: 'hosted',
    tier: hostedTier,
    monthlyCredits,
    requestCost: HOSTED_REQUEST_CREDITS,
    requestsIncluded,
    remainingCredits: balanceKnown ? Math.max(0, remainingCredits) : monthlyCredits,
    remainingRequests: balanceKnown ? Math.max(0, Math.floor(remainingCredits / HOSTED_REQUEST_CREDITS)) : requestsIncluded,
    resetAt: secureAccount?.creditsResetAt || secureAccount?.monthlyCreditsResetAt || getDefaultResetDate(),
    balanceKnown,
    upgradeRecommended: hostedTier !== 'pro',
  }
}
