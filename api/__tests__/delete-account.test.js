import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), owned: vi.fn(), paddle: vi.fn(), deleteUser: vi.fn() }))
vi.mock('../_lib/authBridge.js', () => ({
  authenticateSupabaseUser: mocks.auth, createSupabaseAdminClient: mocks.client,
  logSecureAuditEvent: vi.fn().mockResolvedValue(), setDefaultCorsHeaders: vi.fn(),
}))
vi.mock('../_lib/paddleBilling.js', () => ({ ownedSubscriptions: mocks.owned, paddleRequest: mocks.paddle }))
import handler from '../delete-account.js'
let writes, grants
beforeEach(() => {
  writes = []; grants = []
  mocks.auth.mockResolvedValue({ user: { id: 'owner', email: 'owner@example.invalid' } })
  mocks.owned.mockResolvedValue([{ subscription_id: 'sub_owned' }])
  mocks.paddle.mockResolvedValue({ status: 'canceled' })
  mocks.deleteUser.mockResolvedValue({ error: null })
  mocks.client.mockReturnValue({ auth: { admin: { deleteUser: mocks.deleteUser } }, from(table) {
    let updating = false
    const query = {
      select: () => query, eq: () => query,
      update(payload) { updating = true; writes.push({ table, payload }); return query },
      then(resolve) { return Promise.resolve({ data: updating ? [{ id: 'grant1' }] : grants, error: null }).then(resolve) },
    }
    return query
  } })
})
afterEach(() => vi.clearAllMocks())
async function run({ age = 0, email = 'owner@example.invalid' } = {}) {
  const token = `header.${Buffer.from(JSON.stringify({ amr: [{ timestamp: Math.floor(Date.now()/1000)-age }] })).toString('base64url')}.signature`
  const res = { status(code) { this.code = code; return this }, json(value) { this.value = value; return this } }
  await handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body: { confirmEmail: email } }, res)
  return res
}
it('requires recent original authentication, not merely a refreshed bearer token', async () => {
  expect((await run({ age: 3600 })).code).toBe(403)
  expect(mocks.client).not.toHaveBeenCalled()
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('requires the signed-in email before canceling or deleting anything', async () => {
  expect((await run({ email: 'someone@example.invalid' })).code).toBe(400)
  expect(mocks.paddle).not.toHaveBeenCalled()
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('keeps identifiers and the auth user when provider cancellation fails', async () => {
  mocks.paddle.mockRejectedValue(new Error('Provider unavailable'))
  const result = await run()
  expect(result.code).toBe(503)
  expect(result.value.deletionPending).toBe(true)
  expect(writes.find(write => write.table === 'accounts').payload.deletion_requested_at).toBeTruthy()
  expect(writes.some(write => write.table === 'plan_grants')).toBe(false)
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('confirms cancellation before retiring grants and deleting the account', async () => {
  mocks.paddle.mockResolvedValueOnce({ status: 'active' }).mockResolvedValueOnce({ status: 'canceled' })
  expect((await run()).code).toBe(200)
  expect(mocks.paddle.mock.calls[1][1].body.effective_from).toBe('immediately')
  expect(writes.find(write => write.table === 'plan_grants').payload).toMatchObject({ user_id: null, claim_email: null, status: 'revoked', metadata: { retired: true } })
  expect(mocks.deleteUser).toHaveBeenCalledWith('owner')
})
it('allows one-time BMAC purchases but blocks an uncanceled recurring membership', async () => {
  grants = [{ metadata: { eventType: 'shop.order.created' } }]
  expect((await run()).code).toBe(200)
  mocks.deleteUser.mockClear()
  grants = [{ metadata: { eventType: 'membership.created' } }]
  expect((await run()).code).toBe(409)
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
