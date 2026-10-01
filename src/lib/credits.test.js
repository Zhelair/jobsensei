import { describe, expect, it } from 'vitest'
import { FREE_MONTHLY_CREDITS, PRO_MONTHLY_CREDITS, HOSTED_REQUEST_CREDITS, getCreditSnapshot } from './credits'
import { FREE_MONTHLY_CREDITS as serverFree, PRO_MONTHLY_CREDITS as serverPro, HOSTED_REQUEST_CREDITS as serverCost } from '../../api/_lib/authBridge'

describe('hosted credit allowances', () => {
  it('keeps server and displayed allowances aligned at 15 Free / 810 Pro requests', () => {
    expect([serverFree, serverPro, serverCost]).toEqual([FREE_MONTHLY_CREDITS, PRO_MONTHLY_CREDITS, HOSTED_REQUEST_CREDITS])
    expect(FREE_MONTHLY_CREDITS / HOSTED_REQUEST_CREDITS).toBe(15)
    expect(PRO_MONTHLY_CREDITS / HOSTED_REQUEST_CREDITS).toBe(810)
  })

  it('does not reduce an existing granted balance when the monthly allowance changes', () => {
    const snapshot = getCreditSnapshot({ secureAccount: { planActive: true, planTier: 'pro', creditBalance: 51977 } })
    expect(snapshot.requestsIncluded).toBe(810)
    expect(snapshot.remainingCredits).toBe(51977)
  })

  it('keeps BYOK independent of hosted allowances', () => {
    const snapshot = getCreditSnapshot({ apiKey: 'fixture-key' })
    expect(snapshot.mode).toBe('byok')
    expect(snapshot.remainingCredits).toBeNull()
    expect(snapshot.requestsIncluded).toBeNull()
  })
})
