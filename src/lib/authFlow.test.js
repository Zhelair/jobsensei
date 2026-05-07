import { describe, expect, it } from 'vitest'

import {
  hasAuthCallbackParams,
  normalizeRedirectUrl,
  pickMagicLinkRedirectUrl,
} from './authFlow.js'

describe('authFlow helpers', () => {
  it('detects Supabase auth fragments without treating app sections as auth payloads', () => {
    expect(hasAuthCallbackParams('#access_token=abc&refresh_token=def')).toBe(true)
    expect(hasAuthCallbackParams('#token_hash=xyz&type=magiclink')).toBe(true)
    expect(hasAuthCallbackParams('#settings')).toBe(false)
    expect(hasAuthCallbackParams('#today')).toBe(false)
  })

  it('normalizes redirect urls and strips hashes', () => {
    expect(normalizeRedirectUrl('https://jobsensei.app/#settings')).toBe('https://jobsensei.app/')
    expect(normalizeRedirectUrl('/auth/callback#token', 'https://jobsensei.app')).toBe('https://jobsensei.app/auth/callback')
  })

  it('prefers the current app url for magic-link redirects', () => {
    expect(pickMagicLinkRedirectUrl({
      configuredUrl: 'https://jobsensei.vercel.app/',
      currentUrl: 'https://app.jobsensei.com/#settings',
      baseOrigin: 'https://app.jobsensei.com',
    })).toBe('https://app.jobsensei.com/')
  })
})
