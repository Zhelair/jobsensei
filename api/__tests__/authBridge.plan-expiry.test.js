import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureSecureAccountAccess,
  FREE_MONTHLY_CREDITS,
  PRO_MONTHLY_CREDITS,
} from '../_lib/authBridge.js'

function createPlanGrantUpdateResult(selectedRows) {
  const response = { data: selectedRows, error: null }

  return {
    then(resolve) {
      return Promise.resolve(response).then(resolve)
    },
    select() {
      return Promise.resolve(response)
    },
  }
}

function createSecureAccountSupabaseMock({
  account = null,
  userGrants = [],
  claimableGrants = [],
} = {}) {
  const calls = {
    accountUpserts: [],
    planGrantUpdates: [],
  }

  return {
    calls,
    from(table) {
      if (table === 'accounts') {
        return {
          select() {
            return {
              eq(column, value) {
                expect(column).toBe('user_id')
                expect(value).toBe('user-1')
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: account, error: null })
                  },
                }
              },
            }
          },
          upsert(payload, options) {
            calls.accountUpserts.push({ payload, options })

            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({
                      data: {
                        ...payload,
                        created_at: account?.created_at || payload.linked_at,
                      },
                      error: null,
                    })
                  },
                }
              },
            }
          },
        }
      }

      if (table === 'plan_grants') {
        return {
          select() {
            return {
              eq(column, value) {
                if (column === 'user_id') {
                  expect(value).toBe('user-1')
                  return {
                    eq(nextColumn, nextValue) {
                      expect(nextColumn).toBe('status')
                      expect(nextValue).toBe('active')
                      return {
                        order() {
                          return Promise.resolve({ data: userGrants, error: null })
                        },
                      }
                    },
                  }
                }

                throw new Error(`Unexpected plan_grants select.eq call for ${column}`)
              },
              is(column, value) {
                expect(column).toBe('user_id')
                expect(value).toBe(null)
                return {
                  eq(nextColumn, nextValue) {
                    expect(nextColumn).toBe('claim_email')
                    expect(nextValue).toBe('buyer@example.com')
                    return {
                      eq(lastColumn, lastValue) {
                        expect(lastColumn).toBe('status')
                        expect(lastValue).toBe('active')
                        return {
                          order() {
                            return Promise.resolve({ data: claimableGrants, error: null })
                          },
                        }
                      },
                    }
                  },
                }
              },
            }
          },
          update(payload) {
            return {
              in(column, ids) {
                expect(column).toBe('id')
                calls.planGrantUpdates.push({ payload, ids })

                const matchedRows = [...userGrants, ...claimableGrants]
                  .filter(grant => ids.includes(grant.id))
                  .map(grant => ({
                    ...grant,
                    ...payload,
                    user_id: payload.user_id ?? grant.user_id,
                    claimed_at: payload.claimed_at ?? grant.claimed_at,
                    updated_at: payload.updated_at ?? grant.updated_at,
                  }))

                return createPlanGrantUpdateResult(matchedRows)
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }
}

describe('ensureSecureAccountAccess plan expiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires elapsed Pro grants and falls back to Free credits', async () => {
    const supabase = createSecureAccountSupabaseMock({
      account: {
        email: 'buyer@example.com',
        plan_status: 'active',
        plan_source: 'bmac_webhook',
        plan_tier: 'pro',
        linked_at: '2026-05-01T09:00:00.000Z',
        legacy_code_hash: null,
        credit_balance: 52938,
        credit_period_started_at: '2026-05-01T09:00:00.000Z',
        credit_period_ends_at: '2026-06-01T09:00:00.000Z',
        created_at: '2026-05-01T09:00:00.000Z',
      },
      userGrants: [
        {
          id: 'grant-expired',
          grant_type: 'bmac_webhook',
          external_ref: 'evt-old',
          status: 'active',
          claim_email: 'buyer@example.com',
          user_id: 'user-1',
          metadata: {
            planTier: 'pro',
            expiresAt: '2026-06-01T09:00:00.000Z',
          },
          created_at: '2026-05-01T09:00:00.000Z',
        },
      ],
    })

    const result = await ensureSecureAccountAccess({
      supabase,
      user: { id: 'user-1', email: 'buyer@example.com' },
    })

    expect(supabase.calls.planGrantUpdates).toHaveLength(1)
    expect(supabase.calls.planGrantUpdates[0]).toMatchObject({
      payload: expect.objectContaining({ status: 'expired' }),
      ids: ['grant-expired'],
    })
    expect(supabase.calls.accountUpserts).toHaveLength(1)
    expect(supabase.calls.accountUpserts[0].payload).toMatchObject({
      plan_status: 'active',
      plan_source: 'free_magic_link',
      plan_tier: 'free',
      credit_balance: FREE_MONTHLY_CREDITS,
    })
    expect(result.account.plan_tier).toBe('free')
    expect(result.activeGrants).toEqual([])
    expect(result.planExpiresAt).toBe(null)
  })

  it('claims a matching Pro grant and keeps the Pro allowance active until its expiry', async () => {
    const supabase = createSecureAccountSupabaseMock({
      claimableGrants: [
        {
          id: 'grant-pro',
          grant_type: 'bmac_webhook',
          external_ref: 'evt-new',
          status: 'active',
          claim_email: 'buyer@example.com',
          user_id: null,
          metadata: {
            planTier: 'pro',
            planSource: 'bmac_webhook',
            expiresAt: '2026-07-10T10:00:00.000Z',
          },
          created_at: '2026-06-10T10:00:00.000Z',
        },
      ],
    })

    const result = await ensureSecureAccountAccess({
      supabase,
      user: { id: 'user-1', email: 'buyer@example.com' },
    })

    expect(supabase.calls.planGrantUpdates).toHaveLength(1)
    expect(supabase.calls.planGrantUpdates[0].payload).toMatchObject({
      user_id: 'user-1',
    })
    expect(supabase.calls.accountUpserts).toHaveLength(1)
    expect(supabase.calls.accountUpserts[0].payload).toMatchObject({
      plan_status: 'active',
      plan_source: 'bmac_webhook',
      plan_tier: 'pro',
      credit_balance: PRO_MONTHLY_CREDITS,
    })
    expect(result.account.plan_tier).toBe('pro')
    expect(result.claimedGrantCount).toBe(1)
    expect(result.planExpiresAt).toBe('2026-07-10T10:00:00.000Z')
  })
})
