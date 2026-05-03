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

describe('bmac webhook', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unmock('../_lib/authBridge.js')
  })

  it('creates a grant and sends a claim email for a valid purchase webhook', async () => {
    const createMagicLinkForEmail = vi.fn().mockResolvedValue('https://jobsensei.vercel.app/auth/link')
    const sendMagicLinkEmail = vi.fn().mockResolvedValue({ id: 'email_123' })
    const upsertBmacPlanGrant = vi.fn().mockResolvedValue({
      grant: { id: 'grant-1', status: 'active' },
      userId: null,
      created: true,
      statusChanged: true,
    })

    vi.doMock('../_lib/authBridge.js', () => ({
      canSendCustomAuthEmails: vi.fn().mockReturnValue(true),
      createMagicLinkForEmail,
      createSupabaseAdminClient: vi.fn().mockReturnValue({}),
      extractBmacGrantDetails: vi.fn().mockReturnValue({
        email: 'buyer@example.com',
        eventType: 'support.created',
        externalRef: 'evt_123',
        identifiers: ['jobsensei-access'],
        status: 'active',
        shouldGrantAccess: true,
        metadata: {
          source: 'bmac_webhook',
        },
      }),
      getBmacSignatureHeader: vi.fn().mockReturnValue('valid-signature'),
      getRawRequestBodyString: vi.fn().mockReturnValue('{"event":"support.created"}'),
      getSecureSettingsUrl: vi.fn().mockReturnValue('https://jobsensei.vercel.app/#settings'),
      isBmacWebhookConfigured: vi.fn().mockReturnValue(true),
      sendMagicLinkEmail,
      setDefaultCorsHeaders: vi.fn(),
      upsertBmacPlanGrant,
      verifyBmacWebhookSignature: vi.fn().mockReturnValue(true),
    }))

    const { default: handler } = await import('../webhook.js')
    const { req, res } = makeReqRes(
      { event: 'support.created' },
      { 'x-signature-sha256': 'valid-signature' },
    )

    await handler(req, res)

    expect(res._status).toBe(200)
    expect(upsertBmacPlanGrant).toHaveBeenCalledWith({
      supabase: {},
      email: 'buyer@example.com',
      externalRef: 'evt_123',
      status: 'active',
      metadata: {
        source: 'bmac_webhook',
      },
    })
    expect(createMagicLinkForEmail).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      redirectTo: 'https://jobsensei.vercel.app/#settings',
      data: {
        auth_source: 'bmac_webhook',
        payment_provider: 'bmac',
      },
    })
    expect(sendMagicLinkEmail).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      magicLink: 'https://jobsensei.vercel.app/auth/link',
      redirectTo: 'https://jobsensei.vercel.app/#settings',
      source: 'purchase_claim',
    })
  })
})
