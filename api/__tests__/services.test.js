import { beforeEach, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
const handlers = vi.hoisted(() => ({ feedback: vi.fn(), research: vi.fn(), discovery: vi.fn() }))
vi.mock('../_feedback.js', () => ({ default: handlers.feedback }))
vi.mock('../_research.js', () => ({ default: handlers.research }))
vi.mock('../_discover-jobs.js', () => ({ default: handlers.discovery }))
import service from '../services.js'
beforeEach(() => vi.clearAllMocks())

it('preserves all three public routes and forwards the original request and response', async () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
  for (const [name, target] of [['feedback', handlers.feedback], ['research', handlers.research], ['discover-jobs', handlers.discovery]]) {
    expect(config.rewrites).toContainEqual({ source: `/api/${name}`, destination: `/api/services?service=${name}` })
    const req = { query: { service: name }, method: 'POST', headers: { authorization: 'Bearer fixture' }, body: { fixture: true } }
    const res = {}
    await service(req, res)
    expect(target).toHaveBeenCalledWith(req, res)
  }
})
it('rejects unknown or repeated selectors without invoking a handler', async () => {
  for (const selector of ['__proto__', '../proxy', ['feedback', 'research'], undefined]) {
    const res = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
    await service({ query: { service: selector } }, res)
    expect(res.status).toHaveBeenCalledWith(404)
  }
  for (const target of Object.values(handlers)) expect(target).not.toHaveBeenCalled()
})
it('keeps deployable functions inside the Hobby budget', () => {
  function endpoints(directory) {
    return readdirSync(directory, { withFileTypes: true }).filter(entry => !entry.name.startsWith('_') && !entry.name.startsWith('.')).flatMap(entry => {
      const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
      return entry.isDirectory() ? endpoints(path) : /\.(js|ts|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
    })
  }
  expect(endpoints(new URL('../', import.meta.url)).length).toBeLessThanOrEqual(12)
})
