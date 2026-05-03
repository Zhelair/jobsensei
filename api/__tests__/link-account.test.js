import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function makeReqRes(body = {}, headers = {}, method = 'POST') {
  const req = { method, body, headers }
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this },
    json(data) { this._body = data; return this },
    end() { return this },
    setHeader(key, val) { this._headers[key] = val },
  }
  return { req, res }
}

describe('link-account', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unmock('../_lib/authBridge.js')
  })

  it('rejects an unverified legacy access code', async () => {
    const createSupabaseAdminClient = vi.fn()

    vi.doMock('../_lib/authBridge.js', () => ({
      ACTIVE_PLAN_STATUSES: new Set(['active', 'grace']),
      SECURE_DEVICE_LIMIT: 2,
      authenticateSupabaseUser: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'person@example.com' },
        error: null,
      }),
      createSupabaseAdminClient,
      getRequestDeviceId: vi.fn().mockReturnValue('device-1'),
      hashValue: vi.fn(value => `hash:${value}`),
      isLegacyAccessCodeValid: vi.fn().mockReturnValue(false),
      logSecureAuditEvent: vi.fn(),
      setDefaultCorsHeaders: vi.fn(),
      verifyLegacyAccessToken: vi.fn().mockReturnValue(null),
    }))

    const { default: handler } = await import('../link-account.js')
    const { req, res } = makeReqRes({ legacyCode: 'definitely-not-valid' })

    await handler(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error).toMatch(/could not be verified/i)
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })
})
