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
      DEVICE_REPLACEMENT_COOLDOWN_MS: 48 * 60 * 60 * 1000,
      SECURE_DEVICE_LIMIT: 2,
      authenticateSupabaseUser: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'person@example.com' },
        error: null,
      }),
      createSupabaseAdminClient,
      getDeviceReplacementCooldown: vi.fn().mockReturnValue(null),
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

  it('blocks linking a brand-new device during the replacement cooldown', async () => {
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'device-old',
            device_id: 'device-old',
            device_name: 'Old browser',
            device_label: 'Old browser',
            approved_at: '2026-05-01T08:00:00Z',
            revoked_at: '2026-05-03T08:00:00Z',
            last_seen_at: '2026-05-03T08:00:00Z',
          },
        ],
        error: null,
      }),
    })

    vi.doMock('../_lib/authBridge.js', () => ({
      ACTIVE_PLAN_STATUSES: new Set(['active', 'grace']),
      DEVICE_REPLACEMENT_COOLDOWN_MS: 48 * 60 * 60 * 1000,
      SECURE_DEVICE_LIMIT: 2,
      authenticateSupabaseUser: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'person@example.com' },
        error: null,
      }),
      createSupabaseAdminClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ select }),
      }),
      getDeviceReplacementCooldown: vi.fn().mockReturnValue({
        active: true,
        endsAt: '2026-05-05T08:00:00Z',
        remainingMs: 24 * 60 * 60 * 1000,
        remainingHours: 24,
      }),
      getRequestDeviceId: vi.fn().mockReturnValue('device-new'),
      hashValue: vi.fn(value => `hash:${value}`),
      isLegacyAccessCodeValid: vi.fn().mockReturnValue(true),
      logSecureAuditEvent: vi.fn(),
      setDefaultCorsHeaders: vi.fn(),
      verifyLegacyAccessToken: vi.fn().mockReturnValue(null),
    }))

    const { default: handler } = await import('../link-account.js')
    const { req, res } = makeReqRes({ legacyCode: 'valid-code' })

    await handler(req, res)

    expect(res._status).toBe(429)
    expect(res._body.error).toMatch(/link a new device/i)
    expect(res._body.cooldownEndsAt).toBe('2026-05-05T08:00:00Z')
  })
})
