import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const auth = vi.hoisted(() => ({ authenticateSupabaseUser: vi.fn(), canSendCustomAuthEmails: vi.fn(), sendTransactionalEmail: vi.fn() }))
const limits = vi.hoisted(() => ({ reserveServiceRequest: vi.fn(), finishServiceRequest: vi.fn() }))
vi.mock('../_lib/authBridge.js', () => auth)
vi.mock('../_lib/serviceRequests.js', () => limits)
import handler from '../_feedback'
const body = { category: 'source', requestId: '12345678-1234-1234-1234-123456789012', name: '<script>', message: 'Please support this website.', sourceUrl: 'https://jobs.bg', country: 'Bulgaria', email: 'attacker@example.com', to: 'attacker@example.com' }
function run(data = body) {
  const res = { setHeader: vi.fn(), status(code) { this.code = code; return this }, json(value) { this.value = value; return this } }
  return handler({ method:'POST', body: data, headers: {} },res).then(() => res)
}
beforeEach(() => {
  vi.stubEnv('FEEDBACK_TO_EMAIL','private@example.com')
  auth.authenticateSupabaseUser.mockResolvedValue({ user: { id:'user', email:'verified@example.com' } })
  auth.canSendCustomAuthEmails.mockReturnValue(true)
  auth.sendTransactionalEmail.mockResolvedValue({ id:'email' })
  limits.reserveServiceRequest.mockResolvedValue('reserved')
  limits.finishServiceRequest.mockResolvedValue()
})
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })
it('uses the server recipient and authenticated email; safely escapes content', async () => {
  const res = await run()
  expect(res.code).toBe(200)
  const mail = auth.sendTransactionalEmail.mock.calls[0][0]
  expect(mail.to).toBe('private@example.com')
  expect(mail.replyTo).toBe('verified@example.com')
  expect(mail.html).not.toContain('<script>')
  expect(mail.subject).toContain('Source request')
  expect(JSON.stringify(res.value)).not.toContain('private@example.com')
})
it('rejects signed-out requests without sending', async () => {
  auth.authenticateSupabaseUser.mockResolvedValue({ user:null })
  expect((await run()).code).toBe(401)
  expect(limits.reserveServiceRequest).not.toHaveBeenCalled()
})
it('blocks rate-limited requests and treats sent retries as idempotent', async () => {
  limits.reserveServiceRequest.mockResolvedValue('limited')
  expect((await run()).code).toBe(429)
  limits.reserveServiceRequest.mockResolvedValue('sent')
  expect((await run()).code).toBe(200)
  expect(auth.sendTransactionalEmail).not.toHaveBeenCalled()
})
it('rejects oversized and honeypot submissions', async () => {
  expect((await run({ ...body, message:'a'.repeat(5000) })).code).toBe(400)
  expect((await run({ ...body, website:'spam' })).code).toBe(400)
  expect(auth.sendTransactionalEmail).not.toHaveBeenCalled()
})
