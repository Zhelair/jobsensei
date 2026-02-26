import React, { createContext, useContext, useState, useEffect } from 'react'

const AIContext = createContext(null)

export const PROVIDERS = {
  DEEPSEEK: 'deepseek',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  CUSTOM: 'custom',
}

const PROVIDER_CONFIGS = {
  [PROVIDERS.DEEPSEEK]: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    format: 'openai',
  },
  [PROVIDERS.OPENAI]: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    format: 'openai',
  },
  [PROVIDERS.ANTHROPIC]: {
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    format: 'anthropic',
  },
  [PROVIDERS.CUSTOM]: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    format: 'openai',
  },
}

export { PROVIDER_CONFIGS }

export function AIProvider({ children }) {
  const [provider, setProvider] = useState(PROVIDERS.DEEPSEEK)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('deepseek-chat')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('js_ai_config')
    if (saved) {
      const cfg = JSON.parse(saved)
      setProvider(cfg.provider || PROVIDERS.DEEPSEEK)
      setApiKey(cfg.apiKey || '')
      setModel(cfg.model || 'deepseek-chat')
      setCustomBaseUrl(cfg.customBaseUrl || '')
      if (cfg.apiKey) setIsConnected(true)
    }
  }, [])

  function saveConfig(cfg) {
    const next = { provider: cfg.provider, apiKey: cfg.apiKey, model: cfg.model, customBaseUrl: cfg.customBaseUrl }
    setProvider(cfg.provider)
    setApiKey(cfg.apiKey)
    setModel(cfg.model)
    setCustomBaseUrl(cfg.customBaseUrl || '')
    localStorage.setItem('js_ai_config', JSON.stringify(next))
    setIsConnected(!!cfg.apiKey)
  }

  async function callAI({ systemPrompt, messages, temperature = 0.7, onChunk, signal }) {
    if (!apiKey) throw new Error('No API key configured. Please go to Settings.')

    const cfg = PROVIDER_CONFIGS[provider]
    const baseUrl = provider === PROVIDERS.CUSTOM ? customBaseUrl : cfg.baseUrl

    if (cfg.format === 'anthropic') {
      return callAnthropic({ baseUrl, systemPrompt, messages, temperature, onChunk, signal })
    }
    return callOpenAICompat({ baseUrl, systemPrompt, messages, temperature, onChunk, signal })
  }

  async function callOpenAICompat({ baseUrl, systemPrompt, messages, temperature, onChunk, signal }) {
    const body = {
      model,
      temperature,
      stream: !!onChunk,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API error ${res.status}: ${err}`)
    }

    if (!onChunk) {
      const data = await res.json()
      return data.choices[0].message.content
    }

    // Streaming
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content || ''
          if (delta) { full += delta; onChunk(delta, full) }
        } catch {}
      }
    }
    return full
  }

  async function callAnthropic({ baseUrl, systemPrompt, messages, temperature, onChunk, signal }) {
    const body = {
      model,
      max_tokens: 2048,
      temperature,
      system: systemPrompt,
      stream: !!onChunk,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }

    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API error ${res.status}: ${err}`)
    }

    if (!onChunk) {
      const data = await res.json()
      return data.content[0].text
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'content_block_delta') {
            const delta = parsed.delta?.text || ''
            if (delta) { full += delta; onChunk(delta, full) }
          }
        } catch {}
      }
    }
    return full
  }

  return (
    <AIContext.Provider value={{
      provider, model, apiKey, customBaseUrl, isConnected,
      saveConfig, callAI, PROVIDER_CONFIGS, PROVIDERS,
    }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  return useContext(AIContext)
}
