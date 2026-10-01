import { beforeEach, afterEach, it, expect, vi } from 'vitest'
const auth = vi.hoisted(() => ({ authenticateSupabaseUser: vi.fn() }))
const limits = vi.hoisted(() => ({ reserveServiceRequest: vi.fn(), finishServiceRequest: vi.fn() }))
vi.mock('../_lib/authBridge.js', () => auth)
vi.mock('../_lib/serviceRequests.js', () => limits)
import handler from '../_research'
async function run(body={company:'Example',role:'Analyst'}) {
  const res = { setHeader:vi.fn(), status(code) { this.code=code;return this }, json(value) {this.value=value;return this} }
  await handler({method:'POST',body,headers:{}},res)
  return res
}
beforeEach(() => {
  vi.stubEnv('TAVILY_API_KEY','test-key')
  auth.authenticateSupabaseUser.mockResolvedValue({user:{id:'user'}})
  limits.reserveServiceRequest.mockResolvedValue('reserved')
  limits.finishServiceRequest.mockResolvedValue()
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({answer:'Summary',results:[{title:'Employer',url:'https://example.com',content:'Facts'}]})}))
})
afterEach(() => {vi.clearAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals()})
it('requires auth before consuming search allowance',async()=>{
  auth.authenticateSupabaseUser.mockResolvedValue({user:null})
  expect((await run()).code).toBe(401)
  expect(fetch).not.toHaveBeenCalled()
})
it('does not call Tavily when the shared budget is exhausted',async()=>{
  limits.reserveServiceRequest.mockResolvedValue('budget')
  expect((await run()).value.reason).toBe('budget_reached')
  expect(fetch).not.toHaveBeenCalled()
})
it('returns provenance and uses the current year with basic search',async()=>{
  const res=await run()
  expect(res.value.sources[0].url).toBe('https://example.com')
  expect(res.value.checkedAt).toBeTruthy()
  const payload=JSON.parse(fetch.mock.calls[0][1].body)
  expect(payload.query).toContain(String(new Date().getUTCFullYear()))
  expect(payload.search_depth).toBe('basic')
})
it('distinguishes temporary rate limits from usage limits',async()=>{
  fetch.mockResolvedValue({ok:false,status:429})
  expect((await run()).value.reason).toBe('rate_limited')
  fetch.mockResolvedValue({ok:false,status:432})
  expect((await run()).value.reason).toBe('provider_usage_limit')
})
it('fails closed when persistent limits are unavailable',async()=>{
  limits.reserveServiceRequest.mockRejectedValue(new Error('Database unavailable'))
  expect((await run()).value.fallback).toBe(true)
  expect(fetch).not.toHaveBeenCalled()
})
