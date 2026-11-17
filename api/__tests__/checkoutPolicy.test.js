import { expect, it } from 'vitest'
import { checkoutPolicy, matchesPublicPrice } from '../_lib/checkoutPolicy.js'

it('requires explicit enablement and approval, and never allows production sandbox', () => {
  expect(checkoutPolicy({}).allowed).toBe(false)
  expect(checkoutPolicy({ PADDLE_CHECKOUT_ENABLED: 'true', PADDLE_ENV: 'sandbox', VERCEL_ENV: 'production' }).allowed).toBe(false)
  expect(checkoutPolicy({ PADDLE_CHECKOUT_ENABLED: 'true', PADDLE_ENV: 'live' }).allowed).toBe(false)
  expect(checkoutPolicy({ PADDLE_CHECKOUT_ENABLED: 'true', PADDLE_LIVE_APPROVED: 'true', PADDLE_ENV: 'live', VERCEL_ENV: 'production' }).allowed).toBe(true)
})

it('rejects mismatched amount, tax treatment, cycle and regional overrides', () => {
  const price = { status: 'active', unit_price: { currency_code: 'EUR', amount: '1000' }, billing_cycle: { interval: 'month', frequency: 1 }, tax_mode: 'external' }
  expect(matchesPublicPrice(price)).toBe(true)
  for (const changed of [{ unit_price: { amount: '800', currency_code: 'EUR' } }, { tax_mode: 'internal' }, { billing_cycle: { interval: 'year', frequency: 1 } }, { unit_price_overrides: [{}] }]) expect(matchesPublicPrice({ ...price, ...changed })).toBe(false)
})
