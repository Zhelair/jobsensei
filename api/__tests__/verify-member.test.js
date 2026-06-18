/**
 * Tests for /api/verify-member.js
 *
 * What we're testing:
 *   1. Empty input -> rejected (400)
 *   2. Email input -> magic-link flow starts (200)
 *   3. Wrong legacy code -> rejected (403)
 *   4. Valid legacy code -> JWT token issued (200)
 *   5. Legacy token payload contains the expected fields
 *   6. Missing environment variables -> server error (500/503)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import handler from '../verify-member.js'

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

describe('verify-member auth flow', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'super-secret-test-key'
    process.env.ACCESS_CODES = 'SUPPORTER123, VIP456, testcode'
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
    delete process.env.ACCESS_CODES
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it('returns 200 + magic-link instructions for email input', async () => {
    const { req, res } = makeReqRes({ email: 'Person@Example.com' })
    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({
      next: 'magic_link',
      email: 'person@example.com',
    })
  })

  it('returns 200 + token when access code is valid', async () => {
    const { req, res } = makeReqRes({ email: 'SUPPORTER123' })
    await handler(req, res)

    expect(res._status).toBe(200)
    expect(res._body).toHaveProperty('token')
    expect(typeof res._body.token).toBe('string')
    expect(res._body.token.length).toBeGreaterThan(20)
  })

  it('is case-insensitive for valid legacy codes', async () => {
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
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    const payload = JSON.parse(decoded.data)

    expect(payload).toHaveProperty('code', 'vip456')
    expect(payload).toHaveProperty('exp')
    expect(payload.exp).toBeGreaterThan(Date.now())
  })

  it('returns 403 when access code is wrong', async () => {
    const { req, res } = makeReqRes({ email: 'WRONGCODE' })
    await handler(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error).toMatch(/invalid access code/i)
  })

  it('returns 400 when no input is provided', async () => {
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

  it('returns 500 when JWT_SECRET env var is missing for legacy codes', async () => {
    delete process.env.JWT_SECRET

    const { req, res } = makeReqRes({ email: 'SUPPORTER123' })
    await handler(req, res)

    expect(res._status).toBe(500)
    expect(res._body.error).toMatch(/not configured|server error/i)
  })

  it('returns 500 when ACCESS_CODES env var is missing for legacy codes', async () => {
    delete process.env.ACCESS_CODES

    const { req, res } = makeReqRes({ email: 'SUPPORTER123' })
    await handler(req, res)

    expect(res._status).toBe(500)
  })

  it('returns 503 for email unlock when Supabase server config is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { req, res } = makeReqRes({ email: 'person@example.com' })
    await handler(req, res)

    expect(res._status).toBe(503)
    expect(res._body.error).toMatch(/not configured/i)
  })
})
