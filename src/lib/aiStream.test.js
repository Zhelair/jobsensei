import { describe, expect, it, vi } from 'vitest'
import { readAIStream } from './aiStream'

const encode = text => new TextEncoder().encode(text)
const event = text => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
const body = chunks => new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close() } })

describe('AI SSE reader', () => {
  it('preserves complete messages at every possible byte split, including Unicode', async () => {
    const expected = 'Who owns reporting? Здравей 🙂'
    const bytes = encode(event(expected) + 'data: [DONE]\n\n')
    for (let split = 1; split < bytes.length; split++) {
      expect(await readAIStream(body([bytes.slice(0, split), bytes.slice(split)]), () => {})).toBe(expected)
    }
  })

  it('handles one-byte chunks, CRLF, comments, event metadata and cumulative callbacks', async () => {
    const callback = vi.fn()
    const bytes = encode(': heartbeat\r\nevent: message\r\n' + (event('LEFT ') + event('JOIN')).replace(/\n/g, '\r\n'))
    expect(await readAIStream(body(Array.from(bytes, byte => new Uint8Array([byte]))), callback)).toBe('LEFT JOIN')
    expect(callback.mock.calls).toEqual([['LEFT ', 'LEFT '], ['JOIN', 'LEFT JOIN']])
  })

  it('joins multiline data and flushes a final event without a trailing newline', async () => {
    const stream = 'data: {"choices":\ndata: [{"delta":{"content":"SQL"}}]}\n\n' + event(' works').trimEnd()
    expect(await readAIStream(body([encode(stream)]), () => {})).toBe('SQL works')
  })

  it('ignores non-JSON events without dropping subsequent valid content', async () => {
    expect(await readAIStream(body([encode('data: invalid\n\n' + event('Valid'))]), () => {})).toBe('Valid')
  })

  it('reads Anthropic text deltas and ignores other event types', async () => {
    const bytes = encode('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\ndata: {"type":"message_stop"}\n\n')
    expect(await readAIStream(body([bytes.slice(0, 50), bytes.slice(50)]), () => {}, value => value.type === 'content_block_delta' ? value.delta?.text || '' : '')).toBe('Hello')
  })

  it('does not report an empty stream as success', async () => {
    await expect(readAIStream(body([encode('data: [DONE]\n\n')]), () => {})).rejects.toThrow('empty response')
  })

  it('propagates provider and connection errors', async () => {
    await expect(readAIStream(body([encode('data: {"error":{"message":"Provider failed"}}\n\n')]), () => {})).rejects.toThrow('Provider failed')
    const failed = new ReadableStream({ start(controller) { controller.error(new DOMException('Aborted', 'AbortError')) } })
    await expect(readAIStream(failed, () => {})).rejects.toMatchObject({ name: 'AbortError' })
  })
})
