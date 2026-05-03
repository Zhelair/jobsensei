import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function makeReqRes(body = {}, method = 'POST') {
  const req = { method, body, headers: {} }
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

describe('send-magic-link', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unmock('../_lib/authBridge.js')
  })

  it('sends a custom magic link email through the server route', async () => {
    const createMagicLinkForEmail = vi.fn().mockResolvedValue('https://jobsensei.vercel.app/auth/link')
    const sendMagicLinkEmail = vi.fn().mockResolvedValue({ id: 'email_123' })

    vi.doMock('../_lib/authBridge.js', () => ({
      canSendCustomAuthEmails: vi.fn().mockReturnValue(true),
      createMagicLinkForEmail,
      getMagicLinkRedirectUrl: vi.fn().mockReturnValue('https://jobsensei.vercel.app/'),
      sendMagicLinkEmail,
      setDefaultCorsHeaders: vi.fn(),
    }))

    const { default: handler } = await import('../send-magic-link.js')
    const { req, res } = makeReqRes({
      email: 'person@example.com',
      redirectTo: 'https://jobsensei.vercel.app/',
    })

    await handler(req, res)

    expect(res._status).toBe(200)
    expect(createMagicLinkForEmail).toHaveBeenCalledWith({
      email: 'person@example.com',
      redirectTo: 'https://jobsensei.vercel.app/',
      data: {
        auth_source: 'jobsensei_settings',
      },
    })
    expect(sendMagicLinkEmail).toHaveBeenCalledWith({
      email: 'person@example.com',
      magicLink: 'https://jobsensei.vercel.app/auth/link',
      redirectTo: 'https://jobsensei.vercel.app/',
      source: 'secure_sign_in',
    })
  })
})
