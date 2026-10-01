import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearEffects, spawnConfetti } from './VisualsContext'

describe('bounded confetti lifecycle', () => {
  let now, callback, canvas, context, documentStub
  beforeEach(() => {
    now = 0
    context = Object.fromEntries(['clearRect','save','restore','translate','rotate','fillRect','beginPath','arc','fill','moveTo','lineTo','closePath'].map(key => [key, vi.fn()]))
    canvas = { style: {}, getContext: () => context, remove: vi.fn() }
    documentStub = { visibilityState: 'visible', createElement: vi.fn(() => canvas), body: { appendChild: vi.fn() } }
    vi.stubGlobal('document', documentStub)
    vi.stubGlobal('window', { innerWidth: 100, innerHeight: 100 })
    vi.stubGlobal('performance', { now: () => now })
    vi.stubGlobal('requestAnimationFrame', vi.fn(fn => { callback = fn; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { clearEffects(); vi.unstubAllGlobals() })
  it('caps particles and rejects overlapping bursts', () => {
    expect(spawnConfetti(100000)).toBe(true)
    expect(spawnConfetti()).toBe(false)
    callback(16)
    expect(context.save).toHaveBeenCalledTimes(120)
    expect(documentStub.body.appendChild).toHaveBeenCalledTimes(1)
  })
  it('expires by elapsed time even after a long frame gap', () => {
    spawnConfetti()
    callback(180000)
    expect(canvas.remove).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrame).toHaveBeenCalled()
    expect(spawnConfetti()).toBe(true)
  })
  it('does not spawn hidden and removes an interrupted burst', () => {
    documentStub.visibilityState = 'hidden'
    expect(spawnConfetti()).toBe(false)
    documentStub.visibilityState = 'visible'
    spawnConfetti()
    clearEffects()
    expect(canvas.remove).toHaveBeenCalledTimes(1)
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })
})
