/**
 * Tests for /api/proxy.js
 *
 * What we're testing:
 *   1. No Authorization header → 401
 *   2. Tampered/garbage token → 401
 *   3. Expired token → 401
 *   4. Valid token + valid body → 200 (with mocked DeepSeek)
 *   5. Valid token + missing messages → 400
 *   6. Non-POST request → 405
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'node:crypto'
import handler from '../proxy.js'

// --- Helpers ---

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

// Reproduces the same signing logic as verify-member.js
// so we can create valid and tampered tokens in tests
function signToken(payload, secret = 'test-jwt-secret') {
  const data = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(data)
  const sig = hmac.digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64')
}

function validToken(overrides = {}) {
  return signToken({
    code: 'testcode',
    exp: Date.now() + 60 * 60 * 1000, // 1 hour from now
    ...overrides,
  })
}

function expiredToken() {
  return signToken({
    code: 'testcode',
    exp: Date.now() - 1000, // 1 second in the past
  })
}

// --- Setup ---

beforeEach(() => {
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.DEEPSEEK_API_KEY = 'fake-deepseek-key'

  // Mock the global fetch so tests never hit the real DeepSeek API
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Mocked AI response' } }],
    }),
    body: null,
  }))
})

afterEach(() => {
  delete process.env.JWT_SECRET
  delete process.env.DEEPSEEK_API_KEY
  vi.unstubAllGlobals()
})

// --- Tests ---

describe('proxy — authentication', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const { req, res } = makeReqRes({ messages: [{ role: 'user', content: 'hi' }] }, {})
    await handler(req, res)

    expect(res._status).toBe(401)
    expect(res._body.error).toMatch(/authorization required/i)
  })

  it('returns 401 for garbage token', async () => {
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hi' }] },
      { authorization: 'Bearer not-a-real-token' }
    )
    await handler(req, res)

    expect(res._status).toBe(401)
  })

  it('returns 401 for expired token', async () => {
    const token = expiredToken()
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hi' }] },
      { authorization: `Bearer ${token}` }
    )
    await handler(req, res)

    expect(res._status).toBe(401)
    expect(res._body.error).toMatch(/expired|invalid/i)
  })

  it('returns 401 for token signed with wrong secret', async () => {
    const token = signToken({ code: 'testcode', exp: Date.now() + 60000 }, 'wrong-secret')
    const { req, res } = makeReqRes(
      { messages: [{ role: 'user', content: 'hi' }] },
      { authorization: `Bearer ${token}` }
    )
    await handler(req, res)

    expect(res._status).toBe(401)
  })
})

describe('proxy — request validation', () => {
  it('returns 400 when messages array is missing', async () => {
    const token = validToken()
    const { req, res } = makeReqRes(
      { systemPrompt: 'You are helpful.' }, // no messages!
      { authorization: `Bearer ${token}` }
    )
    await handler(req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toMatch(/invalid request/i)
  })

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = makeReqRes({}, {}, 'GET')
    await handler(req, res)

    expect(res._status).toBe(405)
  })
})

describe('proxy — happy path', () => {
  it('returns 200 with AI content for valid token + valid body', async () => {
    const token = validToken()
    const { req, res } = makeReqRes(
      {
        systemPrompt: 'You are a career coach.',
        messages: [{ role: 'user', content: 'Give me interview tips.' }],
      },
      { authorization: `Bearer ${token}` }
    )
    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toHaveProperty('content', 'Mocked AI response')
  })

  it('forwards systemPrompt as the first system message to DeepSeek', async () => {
    const token = validToken()
    const { req, res } = makeReqRes(
      {
        systemPrompt: 'Custom system prompt here.',
        messages: [{ role: 'user', content: 'Hello' }],
      },
      { authorization: `Bearer ${token}` }
    )
    await handler(req, res)

    // Check that fetch was called with the right body structure
    const fetchCall = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)

    expect(body.messages[0]).toEqual({ role: 'system', content: 'Custom system prompt here.' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' })
  })
})
