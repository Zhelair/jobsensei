import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

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
    labelKey: 'settings.providers.deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    format: 'openai',
  },
  [PROVIDERS.OPENAI]: {
    label: 'OpenAI',
    labelKey: 'settings.providers.openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    format: 'openai',
  },
  [PROVIDERS.ANTHROPIC]: {
    label: 'Anthropic (Claude)',
    labelKey: 'settings.providers.anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    format: 'anthropic',
  },
  [PROVIDERS.CUSTOM]: {
    label: 'Custom (OpenAI-compatible)',
    labelKey: 'settings.providers.custom',
    baseUrl: '',
    defaultModel: '',
    format: 'openai',
  },
}

export { PROVIDER_CONFIGS }

function normalizeModel(provider, model) {
  if (provider === PROVIDERS.DEEPSEEK && (!model || model === 'deepseek-chat')) {
    return PROVIDER_CONFIGS[PROVIDERS.DEEPSEEK].defaultModel
  }
  return model || PROVIDER_CONFIGS[provider]?.defaultModel || ''
}

function parseSavedJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

async function readProxyResponse(res, { onChunk, onUnauthorized } = {}) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Proxy error' }))
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    throw new Error(err.error || `Proxy error ${res.status}`)
  }

  if (!onChunk) {
    const data = await res.json()
    return data.content
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content || ''
        if (delta) {
          full += delta
          onChunk(delta, full)
        }
      } catch {
        // Ignore malformed stream chunks and keep reading.
      }
    }
  }

  return full
}

export function AIProvider({ children }) {
  const {
    secureSession,
    secureAccount,
    deviceId,
  } = useAuth()
  const [provider, setProvider] = useState(PROVIDERS.DEEPSEEK)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(PROVIDER_CONFIGS[PROVIDERS.DEEPSEEK].defaultModel)
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [bmacToken, setBmacToken] = useState(null)
  const [bmacEmail, setBmacEmail] = useState(null)
  const [showPaywall, setShowPaywall] = useState(false)

  const hasSecurePlanAccess = Boolean(secureSession?.access_token && secureAccount?.planActive)

  useEffect(() => {
    const saved = localStorage.getItem('js_ai_config')
    const savedBmac = localStorage.getItem('js_bmac')
    const cfg = parseSavedJson(saved)
    const b = parseSavedJson(savedBmac)

    if (cfg) {
      const savedProvider = cfg.provider || PROVIDERS.DEEPSEEK
      setProvider(savedProvider)
      setApiKey(cfg.apiKey || '')
      setModel(normalizeModel(savedProvider, cfg.model))
      setCustomBaseUrl(cfg.customBaseUrl || '')
    }
    if (b) {
      setBmacToken(b.token || null)
      setBmacEmail(b.email || null)
    }
  }, [])

  useEffect(() => {
    setIsConnected(Boolean(bmacToken || hasSecurePlanAccess))
  }, [bmacToken, hasSecurePlanAccess])

  function saveConfig(cfg) {
    const next = {
      provider: cfg.provider,
      apiKey: cfg.apiKey,
      model: normalizeModel(cfg.provider, cfg.model),
      customBaseUrl: cfg.customBaseUrl,
    }
    setProvider(cfg.provider)
    setApiKey(cfg.apiKey)
    setModel(next.model)
    setCustomBaseUrl(cfg.customBaseUrl || '')
    localStorage.setItem('js_ai_config', JSON.stringify(next))
  }

  function saveBmacToken(token, email) {
    setBmacToken(token)
    setBmacEmail(email)
    localStorage.setItem('js_bmac', JSON.stringify({ token, email }))
  }

  function clearBmacToken() {
    setBmacToken(null)
    setBmacEmail(null)
    localStorage.removeItem('js_bmac')
  }

  function restoreToProxy() {
    setApiKey('')
    setProvider(PROVIDERS.DEEPSEEK)
    setModel(PROVIDER_CONFIGS[PROVIDERS.DEEPSEEK].defaultModel)
    setCustomBaseUrl('')
    localStorage.setItem('js_ai_config', JSON.stringify({
      provider: PROVIDERS.DEEPSEEK,
      apiKey: '',
      model: PROVIDER_CONFIGS[PROVIDERS.DEEPSEEK].defaultModel,
      customBaseUrl: '',
    }))
  }

  async function verifyBmac(email) {
    const res = await fetch('/api/verify-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Verification failed')
    saveBmacToken(data.token, email)
    return true
  }

  async function callAI({ systemPrompt, messages, temperature = 0.7, onChunk, signal }) {
    const hasHostedAccess = Boolean(bmacToken || hasSecurePlanAccess)

    if (!hasHostedAccess) {
      setShowPaywall(true)
      throw new Error('JobSensei access required.')
    }

    if (!apiKey) {
      setIsThinking(true)
      try {
        if (hasSecurePlanAccess) {
          return await callSecureProxy({
            accessToken: secureSession.access_token,
            deviceId,
            systemPrompt,
            messages,
            temperature,
            onChunk,
            signal,
          })
        }

        return await callLegacyProxy({
          bmacToken,
          systemPrompt,
          messages,
          temperature,
          onChunk,
          signal,
        })
      } finally {
        setIsThinking(false)
      }
    }

    const cfg = PROVIDER_CONFIGS[provider]
    const baseUrl = provider === PROVIDERS.CUSTOM ? customBaseUrl : cfg.baseUrl

    setIsThinking(true)
    try {
      if (cfg.format === 'anthropic') {
        return await callAnthropic({ baseUrl, systemPrompt, messages, temperature, onChunk, signal })
      }
      return await callOpenAICompat({ baseUrl, systemPrompt, messages, temperature, onChunk, signal })
    } finally {
      setIsThinking(false)
    }
  }

  async function callLegacyProxy({ bmacToken: token, systemPrompt, messages, temperature, onChunk, signal }) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ systemPrompt, messages, temperature, stream: !!onChunk }),
      signal,
    })

    return readProxyResponse(res, {
      onChunk,
      onUnauthorized: clearBmacToken,
    })
  }

  async function callSecureProxy({ accessToken, deviceId: secureDeviceId, systemPrompt, messages, temperature, onChunk, signal }) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Device-Id': secureDeviceId,
      },
      body: JSON.stringify({ systemPrompt, messages, temperature, stream: !!onChunk, deviceId: secureDeviceId }),
      signal,
    })

    return readProxyResponse(res, { onChunk })
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content || ''
          if (delta) {
            full += delta
            onChunk(delta, full)
          }
        } catch {
          // Ignore malformed stream chunks and keep reading.
        }
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
      messages: messages.map(message => ({ role: message.role, content: message.content })),
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
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'content_block_delta') {
            const delta = parsed.delta?.text || ''
            if (delta) {
              full += delta
              onChunk(delta, full)
            }
          }
        } catch {
          // Ignore malformed stream chunks and keep reading.
        }
      }
    }
    return full
  }

  return (
    <AIContext.Provider value={{
      provider,
      model,
      apiKey,
      customBaseUrl,
      isConnected,
      isThinking,
      bmacToken,
      bmacEmail,
      showPaywall,
      openPaywall: () => setShowPaywall(true),
      closePaywall: () => setShowPaywall(false),
      saveConfig,
      callAI,
      verifyBmac,
      clearBmacToken,
      restoreToProxy,
      PROVIDER_CONFIGS,
      PROVIDERS,
    }}
    >
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  return useContext(AIContext)
}
