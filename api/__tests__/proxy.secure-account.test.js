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
    write() {},
    headersSent: false,
  }
  return { req, res }
}

describe('proxy secure-account mode', () => {
  let consumeHostedCreditsMock
  let refundHostedCreditsMock

  beforeEach(() => {
    vi.resetModules()
    process.env.DEEPSEEK_API_KEY = 'fake-deepseek-key'
    delete process.env.JWT_SECRET

    consumeHostedCreditsMock = vi.fn().mockResolvedValue({ charged: true, balance: 52969 })
    refundHostedCreditsMock = vi.fn().mockResolvedValue({ refunded: true, balance: 53000 })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Secure path response' } }],
      }),
      body: null,
    }))
  })

  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY
    delete process.env.JWT_SECRET
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.unmock('../_lib/authBridge.js')
  })

  function mockAuthBridge() {
    vi.doMock('../_lib/authBridge.js', () => ({
      ACTIVE_PLAN_STATUSES: new Set(['active', 'grace']),
      authenticateSupabaseUser: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'person@example.com' },
        error: null,
      }),
      consumeHostedCredits: consumeHostedCreditsMock,
      createSupabaseAdminClient: vi.fn().mockReturnValue({ rpc: vi.fn() }),
      ensureSecureAccountAccess: vi.fn().mockResolvedValue({
        account: { plan_status: 'active' },
      }),
      ensureSecureDeviceAccess: vi.fn().mockResolvedValue({
        currentDeviceApproved: true,
        currentDeviceMissing: false,
        blockedReason: null,
        currentDevice: { deviceId: 'js-device-1' },
      }),
      HOSTED_REQUEST_CREDITS: 31,
      looksLikeJwt: vi.fn().mockReturnValue(true),
      readSecureDeviceContext: vi.fn().mockReturnValue({
        deviceId: 'js-device-1',
        deviceName: 'Windows - Chrome',
      }),
      readBearerToken: vi.fn().mockReturnValue('jwt-token'),
      refundHostedCredits: refundHostedCreditsMock,
      setDefaultCorsHeaders: vi.fn(),
      verifyLegacyAccessToken: vi.fn().mockReturnValue(null),
    }))
  }

  it('does not require JWT_SECRET for secure-account traffic', async () => {
    mockAuthBridge()

    const { default: handler } = await import('../proxy.js')
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hello' }] },
      { authorization: 'Bearer jwt-token' },
    )

    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({ content: 'Secure path response' })
    expect(res._headers['X-JobSensei-Credit-Balance']).toBe('52969')
    expect(consumeHostedCreditsMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      deviceId: 'js-device-1',
      cost: 31,
    }))
    expect(refundHostedCreditsMock).not.toHaveBeenCalled()
  })

  it('returns 402 before calling the provider when credits are exhausted', async () => {
    consumeHostedCreditsMock.mockResolvedValueOnce({
      charged: false,
      balance: 0,
      error: 'insufficient_credits',
    })
    mockAuthBridge()

    const { default: handler } = await import('../proxy.js')
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hello' }] },
      { authorization: 'Bearer jwt-token' },
    )

    await handler(req, res)

    expect(res._status).toBe(402)
    expect(res._body).toEqual({
      error: 'You do not have enough hosted AI credits left on this account. Upgrade to Pro or switch to your own API key in Settings.',
    })
    expect(fetch).not.toHaveBeenCalled()
    expect(refundHostedCreditsMock).not.toHaveBeenCalled()
  })

  it('refunds reserved credits when the provider returns an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'provider unavailable',
    }))
    mockAuthBridge()

    const { default: handler } = await import('../proxy.js')
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hello' }] },
      { authorization: 'Bearer jwt-token' },
    )

    await handler(req, res)

    expect(res._status).toBe(503)
    expect(res._body).toEqual({ error: 'AI error: provider unavailable' })
    expect(refundHostedCreditsMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      deviceId: 'js-device-1',
      amount: 31,
      reason: 'provider_http_error',
    }))
  })
})
