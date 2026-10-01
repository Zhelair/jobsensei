// Network chunks are arbitrary byte boundaries, not complete SSE messages.
export async function readAIStream(body, onChunk, getDelta = event => event.choices?.[0]?.delta?.content || '') {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  let eventData = []
  let full = ''
  let finished = false

  function dispatch() {
    if (!eventData.length) return
    const data = eventData.join('\n')
    eventData = []
    if (data === '[DONE]') {
      finished = true
      return
    }
    let event
    try {
      event = JSON.parse(data)
    } catch {
      // Preserve tolerance for non-JSON events; incomplete events stay buffered.
      return
    }
    if (event.error) throw new Error(event.error.message || 'AI stream error')
    const delta = getDelta(event)
    if (delta) {
      full += delta
      onChunk(delta, full)
    }
  }

  function consumeLines(final = false) {
    let newline
    while (!finished && (newline = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, newline).replace(/\r$/, '')
      pending = pending.slice(newline + 1)
      if (!line) dispatch()
      else if (line.startsWith('data:')) eventData.push(line.slice(5).replace(/^ /, ''))
    }
    if (final && !finished) {
      const line = pending.replace(/\r$/, '')
      if (line.startsWith('data:')) eventData.push(line.slice(5).replace(/^ /, ''))
      pending = ''
      dispatch()
    }
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) {
        pending += decoder.decode()
        consumeLines(true)
        break
      }
      pending += decoder.decode(value, { stream: true })
      consumeLines()
    }
  } finally {
    reader.releaseLock()
  }
  if (!full.trim()) throw new Error('The AI returned an empty response. Please try again.')
  return full
}
