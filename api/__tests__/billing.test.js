import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), owned: vi.fn(), paddle: vi.fn() }))
vi.mock('../_lib/authBridge.js', () => ({ authenticateSupabaseUser: mocks.auth, createSupabaseAdminClient: mocks.client }))
vi.mock('../_lib/paddleBilling.js', () => ({ ownedSubscriptions: mocks.owned, paddleRequest: mocks.paddle }))
import handler from '../_billing.js'
let writes
beforeEach(() => {
  vi.stubEnv('PADDLE_PRO_PRICE_ID', 'pri_server')
  writes = []
  mocks.auth.mockResolvedValue({ user: { id: 'owner', email: 'owner@example.invalid' } })
  mocks.owned.mockResolvedValue([])
  mocks.paddle.mockResolvedValue({ id: 'txn_server' })
  mocks.client.mockReturnValue({ rpc: vi.fn().mockImplementation(async (name, args) => {
    writes.push({ table: 'billing_checkouts', payload: { id: args.p_checkout_id, user_id: args.p_user_id } })
    return { data: { status: 'reserved' }, error: null }
  }), from(table) {
    const query = { select: () => query, eq: () => query,
      single: async () => ({ data: { deletion_requested_at: null }, error: null }),
      insert(payload) { writes.push({ table, payload }); return Promise.resolve({ error: null }) },
      update(payload) { writes.push({ table, payload }); return query },
      then(resolve) { return Promise.resolve({ error: null }).then(resolve) },
    }
    return query
  } })
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })
async function run(body) {
  const res = { setHeader: vi.fn(), status(code) { this.code = code; return this }, json(value) { this.value = value; return this } }
  await handler({ method: 'POST', body }, res)
  return res
}
it('binds checkout to the verified account and server price, ignoring submitted identity and price', async () => {
  const result = await run({ action: 'checkout', userId: 'victim', priceId: 'pri_cheaper', email: 'victim@example.invalid' })
  expect(result.code).toBe(200)
  expect(writes[0].payload.user_id).toBe('owner')
  expect(mocks.paddle.mock.calls[0][1].body.items).toEqual([{ price_id: 'pri_server', quantity: 1 }])
  expect(mocks.paddle.mock.calls[0][1].body.custom_data).toEqual({ jobsensei_checkout_id: writes[0].payload.id })
})
it('requires authentication before creating a provider transaction', async () => {
  mocks.auth.mockResolvedValue({ user: null })
  expect((await run({ action: 'checkout' })).code).toBe(401)
  expect(mocks.paddle).not.toHaveBeenCalled()
})
it('prevents another subscription while the existing one is active or past due', async () => {
  mocks.owned.mockResolvedValue([{ subscription_id: 'sub_owned', status: 'past_due' }])
  expect((await run({ action: 'checkout' })).code).toBe(409)
  expect(mocks.paddle).not.toHaveBeenCalled()
})
it('cannot cancel a subscription belonging to another account', async () => {
  mocks.owned.mockResolvedValue([{ subscription_id: 'sub_owned', status: 'active' }])
  expect((await run({ action: 'cancel', subscriptionId: 'sub_victim' })).code).toBe(404)
  expect(mocks.paddle).not.toHaveBeenCalled()
})
it('schedules cancellation without removing access or changing credits', async () => {
  mocks.owned.mockResolvedValue([{ subscription_id: 'sub_owned', status: 'active' }])
  mocks.paddle.mockResolvedValueOnce({ status: 'active' }).mockResolvedValueOnce({ status: 'active', scheduled_change: { action: 'cancel', effective_at: '2026-11-09T12:00:00Z' } })
  expect((await run({ action: 'cancel', subscriptionId: 'sub_owned' })).code).toBe(200)
  expect(mocks.paddle.mock.calls[1][1].body.effective_from).toBe('next_billing_period')
  expect(writes.every(write => write.table !== 'accounts')).toBe(true)
})
