import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { processPaddleEvent } from '../_lib/paddleBilling.js'
beforeEach(() => {
  vi.stubEnv('PADDLE_API_KEY', 'pdl_sdbx_fixture')
  vi.stubEnv('PADDLE_ENV', 'sandbox')
  vi.stubEnv('PADDLE_PRO_PRICE_ID', 'pri_pro')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {
    id: 'sub_example', status: 'active', items: [{ price: { id: 'pri_pro' } }],
  } }) }))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it.each(['adjustment.created','adjustment.updated'])('handles an approved refund through %s using current provider records', async (eventType) => {
  const adjustment = {id:'adj_example',status:'approved',action:'refund',type:'full',transaction_id:'txn_example',subscription_id:'sub_example',customer_id:'ctm_example'}
  const transaction = {id:'txn_example',subscription_id:'sub_example',customer_id:'ctm_example',items:[{price:{id:'pri_pro'}}]}
  const subscription = {id:'sub_example',customer_id:'ctm_example'}
  fetch.mockImplementation(async url => ({ok:true,json:async()=>({data:url.includes('/adjustments/')?adjustment:url.includes('/transactions/')?transaction:subscription})}))
  const rpc = vi.fn().mockResolvedValue({data:{ok:true},error:null})
  await processPaddleEvent({rpc},{event_id:'evt_refund',occurred_at:'2026-10-13T12:00:00Z',event_type:eventType,data:{id:'adj_example'}})
  expect(rpc).toHaveBeenCalledWith('apply_paddle_adjustment',expect.objectContaining({p_adjustment:adjustment,p_transaction:transaction}))
})
it.each(['pending_approval','rejected'])('does not revoke access for a %s refund', async status => {
  fetch.mockResolvedValue({ok:true,json:async()=>({data:{id:'adj_example',status,action:'refund'}})})
  const rpc=vi.fn()
  expect(await processPaddleEvent({rpc},{event_id:'evt_refund',occurred_at:'2026-10-13T12:00:00Z',event_type:'adjustment.updated',data:{id:'adj_example'}})).toEqual({skipped:true})
  expect(rpc).not.toHaveBeenCalled()
})
it('loads current subscription state and processes completed payments atomically', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null })
  const transaction = { id: 'txn_example', subscription_id: 'sub_example' }
  await processPaddleEvent({ rpc }, { event_id: 'evt_paid', occurred_at: '2026-10-09T12:00:00Z', event_type: 'transaction.completed', data: transaction })
  expect(fetch.mock.calls[0][0]).toBe('https://sandbox-api.paddle.com/subscriptions/sub_example')
  expect(rpc.mock.calls[0][1].p_transaction).toEqual(transaction)
})
it('never provisions an unrelated product', async () => {
  vi.stubEnv('PADDLE_PRO_PRICE_ID', 'pri_other')
  const rpc = vi.fn()
  expect(await processPaddleEvent({ rpc }, { event_id: 'evt_update', occurred_at: '2026-10-09T12:00:00Z', event_type: 'subscription.updated', data: { id: 'sub_example' } })).toEqual({ skipped: true })
  expect(rpc).not.toHaveBeenCalled()
})
it('rejects missing event identity and propagates database failures for provider retry', async () => {
  const rpc = vi.fn().mockResolvedValue({ error: new Error('Binding missing') })
  await expect(processPaddleEvent({ rpc }, { event_type: 'subscription.updated' })).rejects.toThrow('Missing event identity')
  await expect(processPaddleEvent({ rpc }, { event_id: 'evt_update', occurred_at: '2026-10-09T12:00:00Z', event_type: 'subscription.updated', data: { id: 'sub_example' } })).rejects.toThrow('Binding missing')
})
