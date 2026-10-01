import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const auth = vi.hoisted(() => ({ authenticateSupabaseUser: vi.fn() }))
const limits = vi.hoisted(() => ({ reserveServiceRequest: vi.fn(), finishServiceRequest: vi.fn() }))
vi.mock('../_lib/authBridge.js', () => auth)
vi.mock('../_lib/serviceRequests.js', () => limits)
import handler from '../_discover-jobs.js'
async function run(body = { keywords: 'Risk analyst', location: 'Sofia' }) {
  const res = { setHeader: vi.fn(), status(code) { this.code = code; return this }, json(value) { this.value = value; return this } }
  await handler({ method: 'POST', body, headers: {} }, res)
  return res
}
beforeEach(() => {
  vi.stubEnv('TAVILY_API_KEY', 'test-key')
  auth.authenticateSupabaseUser.mockResolvedValue({ user: { id: 'user' } })
  limits.reserveServiceRequest.mockResolvedValue('reserved')
  limits.finishServiceRequest.mockResolvedValue()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ title: 'Risk analyst', url: 'https://linkedin.com/jobs/view/123', content: 'SQL Sofia' }, { url: 'https://linkedin.com/jobs/search/' }, { url: 'javascript:alert(1)' }] }) }))
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('requires authentication and validates sources before spending', async () => {
  expect((await run({ keywords: 'Risk', source: 'arbitrary' })).code).toBe(400)
  auth.authenticateSupabaseUser.mockResolvedValue({ user: null })
  expect((await run()).code).toBe(401)
  expect(fetch).not.toHaveBeenCalled()
})
it('does not apply app-added search limits even when the legacy limiter would block', async () => {
  limits.reserveServiceRequest.mockResolvedValue('limited')
  expect((await run()).code).toBe(200)
  expect(limits.reserveServiceRequest).not.toHaveBeenCalled()
})
it('makes one bounded basic search and returns only supported vacancy links', async () => {
  const res = await run()
  expect(res.value.results.map(job => job.id)).toEqual(['linkedin:123'])
  expect(fetch).toHaveBeenCalledTimes(1)
  const payload = JSON.parse(fetch.mock.calls[0][1].body)
  expect(payload.search_depth).toBe('basic')
  expect(payload.auto_parameters).toBe(false)
  expect(payload.max_results).toBe(20)
  expect(limits.reserveServiceRequest).not.toHaveBeenCalled()
})
it('reports provider exhaustion without inventing fallback jobs', async () => {
  fetch.mockResolvedValue({ ok: false, status: 432 })
  const res = await run()
  expect(res.code).toBe(503)
  expect(res.value.error).toContain('Monthly job-search allowance exhausted')
  expect(res.value.results).toBeUndefined()
})
