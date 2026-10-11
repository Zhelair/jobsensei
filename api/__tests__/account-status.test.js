import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), account: vi.fn(), device: vi.fn() }))
vi.mock('../_lib/authBridge.js', () => ({
  ACTIVE_PLAN_STATUSES: new Set(['active', 'grace']),
  authenticateSupabaseUser: mocks.auth,
  createSupabaseAdminClient: mocks.client,
  ensureSecureAccountAccess: mocks.account,
  ensureSecureDeviceAccess: mocks.device,
  readSecureDeviceContext: () => ({}),
  setDefaultCorsHeaders: () => {},
}))
import handler from '../account-status.js'
beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: 'owner', email: 'owner@example.invalid' } })
  mocks.account.mockResolvedValue({ claimedGrantCount: 0 })
  mocks.device.mockResolvedValue({ currentDeviceApproved: true })
  const query = { select: () => query, eq: () => query,
    maybeSingle: async () => ({ data: { email: 'owner@example.invalid', plan_status: 'active', plan_tier: 'free', credit_balance: 465 }, error: null }) }
  mocks.client.mockReturnValue({ from: () => query })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.resetAllMocks(); vi.restoreAllMocks() })
async function run() {
  const res = { setHeader: vi.fn(), status(code) { this.code = code; return this }, json(value) { this.value = value; return this } }
  await handler({ method: 'GET' }, res)
  return res
}
it('returns an actionable schema error without granting access when the migration is absent', async () => {
  mocks.account.mockRejectedValue({ code: '42703', message: 'column accounts.deletion_requested_at does not exist' })
  const res = await run()
  expect(res.code).toBe(503)
  expect(res.value.code).toBe('ACCOUNT_SCHEMA_UPDATE_REQUIRED')
  expect(res.value.account).toBeUndefined()
  expect(mocks.device).not.toHaveBeenCalled()
})
it('does not misdiagnose an unrelated database failure as a missing migration', async () => {
  mocks.account.mockRejectedValue({ code: '08006', message: 'private connection details' })
  const res = await run()
  expect(res.code).toBe(500)
  expect(res.value.error).not.toContain('private')
  expect(res.value.code).toBeUndefined()
})
it('loads account and device access with a current schema', async () => {
  const res = await run()
  expect(res.code).toBe(200)
  expect(res.value.account.planActive).toBe(true)
  expect(res.value.account.currentDeviceApproved).toBe(true)
})
