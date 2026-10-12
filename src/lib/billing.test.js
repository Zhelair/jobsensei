import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules() })

async function configuredBilling() {
  vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', 'test_client_token')
  vi.stubEnv('VITE_PADDLE_PRO_PRICE_ID', 'pri_test')
  vi.stubEnv('VITE_PADDLE_ENV', 'sandbox')
  vi.resetModules()
  return import('./billing')
}

it('reports missing configuration instead of opening an unrelated pricing tab', async () => {
  vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', '')
  vi.stubEnv('VITE_PADDLE_PRO_PRICE_ID', '')
  const open = vi.fn()
  vi.stubGlobal('window', { open })
  const { openProCheckout } = await import('./billing')
  await expect(openProCheckout()).rejects.toThrow('unavailable on this deployment')
  expect(open).not.toHaveBeenCalled()
})

it('requires an account before loading Paddle or requesting a transaction', async () => {
  const { openProCheckout } = await configuredBilling()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  await expect(openProCheckout()).rejects.toThrow('Sign in first')
  expect(fetch).not.toHaveBeenCalled()
})

it('opens the server-selected sandbox transaction for the signed-in account', async () => {
  const { openProCheckout } = await configuredBilling()
  const Paddle = { Environment: { set: vi.fn() }, Initialize: vi.fn(), Checkout: { open: vi.fn() } }
  vi.stubGlobal('window', { Paddle, location: { origin: 'https://jobsensei.app' } })
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ transactionId: 'txn_test' }) })
  vi.stubGlobal('fetch', fetch)
  await openProCheckout({ userId: 'user_test', accessToken: 'test_access', email: 'test@example.invalid' })
  expect(Paddle.Environment.set).toHaveBeenCalledWith('sandbox')
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test_access')
  expect(Paddle.Checkout.open).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'txn_test' }))
})

it('initializes Paddle for a payment link without creating a transaction', async () => {
  const { initializePaddlePaymentLink } = await configuredBilling()
  const Paddle = { Environment: { set: vi.fn() }, Initialize: vi.fn() }
  vi.stubGlobal('window', { Paddle })
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(await initializePaddlePaymentLink('?_ptxn=txn_test123')).toBe(true)
  expect(Paddle.Initialize).toHaveBeenCalledTimes(1)
  expect(fetch).not.toHaveBeenCalled()
})

it('does not load Paddle on normal navigation or malformed payment links', async () => {
  const { initializePaddlePaymentLink } = await configuredBilling()
  expect(await initializePaddlePaymentLink('')).toBe(false)
  expect(await initializePaddlePaymentLink('?_ptxn=invalid')).toBe(false)
})
