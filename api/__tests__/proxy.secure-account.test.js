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
  beforeEach(() => {
    vi.resetModules()
    process.env.DEEPSEEK_API_KEY = 'fake-deepseek-key'
    delete process.env.JWT_SECRET

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

  it('does not require JWT_SECRET for secure-account traffic', async () => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: { plan_status: 'active' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'device-row', approved_at: '2026-05-03T12:00:00Z', revoked_at: null }, error: null })

    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const from = vi.fn(table => {
      if (table === 'accounts' || table === 'device_registrations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle,
              }),
              maybeSingle,
            }),
            update,
          }),
          update,
        }
      }

      if (table === 'api_usage_events') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    vi.doMock('../_lib/authBridge.js', () => ({
      ACTIVE_PLAN_STATUSES: new Set(['active', 'grace']),
      authenticateSupabaseUser: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'person@example.com' },
        error: null,
      }),
      createSupabaseAdminClient: vi.fn().mockReturnValue({ from }),
      getRequestDeviceId: vi.fn().mockReturnValue('device-1'),
      looksLikeJwt: vi.fn().mockReturnValue(true),
      readBearerToken: vi.fn().mockReturnValue('jwt-token'),
      setDefaultCorsHeaders: vi.fn(),
      verifyLegacyAccessToken: vi.fn().mockReturnValue(null),
    }))

    const { default: handler } = await import('../proxy.js')
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hello' }] },
      { authorization: 'Bearer jwt-token', 'x-device-id': 'device-1' },
    )

    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({ content: 'Secure path response' })
  })
})
