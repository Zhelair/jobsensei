/**
 * Tests for /api/verify-member.js
 *
 * What we're testing (the auth flow):
 *   1. Empty code → rejected (400)
 *   2. Wrong code → rejected (403)
 *   3. Valid code → JWT token issued (200)
 *   4. Token can be decoded and contains correct fields
 *   5. Missing environment variables → server error (500)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import handler from '../verify-member.js'

// --- Helpers ---

// Creates a fake req/res pair (mimics how Vercel calls your function)
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

// --- Tests ---

describe('verify-member — auth flow', () => {
  // Set up real-looking env vars before each test
  beforeEach(() => {
    process.env.JWT_SECRET = 'super-secret-test-key'
    process.env.ACCESS_CODES = 'SUPPORTER123, VIP456, testcode'
  })

  // Clean up after each test so we don't leak state
  afterEach(() => {
    delete process.env.JWT_SECRET
    delete process.env.ACCESS_CODES
  })

  // ✅ Happy path
  it('returns 200 + token when access code is valid', async () => {
    const { req, res } = makeReqRes({ email: 'SUPPORTER123' })
    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toHaveProperty('token')
    expect(typeof res._body.token).toBe('string')
    expect(res._body.token.length).toBeGreaterThan(20)
  })

  it('is case-insensitive — accepts lowercase version of valid code', async () => {
    const { req, res } = makeReqRes({ email: 'supporter123' })
    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toHaveProperty('token')
  })

  it('token decodes correctly and contains expiry in the future', async () => {
    const { req, res } = makeReqRes({ email: 'VIP456' })
    await handler(req, res)

    expect(res._status).toBe(200)
    const token = res._body.token

    // Decode: it's base64 → JSON with { data, sig }
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    const payload = JSON.parse(decoded.data)

    expect(payload).toHaveProperty('code', 'vip456')
    expect(payload).toHaveProperty('exp')
    expect(payload.exp).toBeGreaterThan(Date.now()) // expires in the future
  })

  // ❌ Rejection cases
  it('returns 403 when access code is wrong', async () => {
    const { req, res } = makeReqRes({ email: 'WRONGCODE' })
    await handler(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error).toMatch(/invalid access code/i)
  })

  it('returns 400 when no code is provided', async () => {
    const { req, res } = makeReqRes({ email: '' })
    await handler(req, res)

    expect(res._status).toBe(400)
    expect(res._body.error).toMatch(/required/i)
  })

  it('returns 400 when body is empty', async () => {
    const { req, res } = makeReqRes({})
    await handler(req, res)

    expect(res._status).toBe(400)
  })

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = makeReqRes({}, 'GET')
    await handler(req, res)

    expect(res._status).toBe(405)
  })

  // 🔧 Server config errors
  it('returns 500 when JWT_SECRET env var is missing', async () => {
    delete process.env.JWT_SECRET

    const { req, res } = makeReqRes({ email: 'SUPPORTER123' })
    await handler(req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toMatch(/not configured|server error/i)
  })

  it('returns 500 when ACCESS_CODES env var is missing', async () => {
    delete process.env.ACCESS_CODES

    const { req, res } = makeReqRes({ email: 'SUPPORTER123' })
    await handler(req, res)

    expect(res._status).toBe(500)
  })
})
