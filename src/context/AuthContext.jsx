import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  POST_AUTH_SECTION_STORAGE_KEY,
  hasAuthCallbackParams,
  normalizeRedirectUrl,
  pickMagicLinkRedirectUrl,
} from '../lib/authFlow'

const AuthContext = createContext(null)

function getMagicLinkRedirectUrl() {
  const configuredUrl = (
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    ''
  )
  const currentUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`

  return (
    pickMagicLinkRedirectUrl({
      configuredUrl,
      currentUrl,
      baseOrigin: window.location.origin,
    }) ||
    window.location.origin
  )
}

function readAuthHashParams() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  return new URLSearchParams(hash)
}

function readAuthQueryParams() {
  return new URLSearchParams(window.location.search)
}

function clearAuthRedirectState({ clearHash = true, clearQuery = true } = {}) {
  const url = new URL(window.location.href)

  if (clearHash) {
    url.hash = ''
  }

  if (clearQuery) {
    [
      'code',
      'type',
      'token_hash',
      'error',
      'error_code',
      'error_description',
    ].forEach(key => url.searchParams.delete(key))
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, document.title, nextUrl)
}

function rememberPostAuthSection(section = 'settings') {
  localStorage.setItem(POST_AUTH_SECTION_STORAGE_KEY, section)
}

function completePostAuthNavigation() {
  const savedSection = localStorage.getItem(POST_AUTH_SECTION_STORAGE_KEY)
  const hasPendingAuthCallback = hasAuthCallbackParams(window.location.hash)
  if (!savedSection && !hasPendingAuthCallback) return

  const nextSection = savedSection || 'settings'
  localStorage.removeItem(POST_AUTH_SECTION_STORAGE_KEY)
  window.history.replaceState(window.history.state, document.title, `#${nextSection}`)
}

function readOrCreateDeviceId() {
  const saved = localStorage.getItem('js_device_id')
  if (saved) return saved

  const next = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `js-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`

  localStorage.setItem('js_device_id', next)
  return next
}

function defaultDeviceName() {
  const platform = window.navigator.userAgentData?.platform || window.navigator.platform || 'Browser'
  return `${platform} browser`
}

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export function AuthProvider({ children }) {
  const [bridgeStatus, setBridgeStatus] = useState({
    loading: true,
    legacyAccessEnabled: false,
    secureAccountsEnabled: false,
    customAuthEmailsEnabled: false,
    deviceLimit: 2,
    authMode: 'legacy_only',
    supabase: null,
  })
  const [statusError, setStatusError] = useState('')
  const [supabase, setSupabase] = useState(null)
  const [secureSession, setSecureSession] = useState(null)
  const [secureUser, setSecureUser] = useState(null)
  const [secureAccount, setSecureAccount] = useState(null)
  const [secureDevices, setSecureDevices] = useState([])
  const [deviceReplacementCooldown, setDeviceReplacementCooldown] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [sendingMagicLink, setSendingMagicLink] = useState(false)
  const [magicLinkSentTo, setMagicLinkSentTo] = useState('')
  const [linkingAccess, setLinkingAccess] = useState(false)
  const [revokingDeviceId, setRevokingDeviceId] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exportingAccountData, setExportingAccountData] = useState(false)
  const [deviceId] = useState(() => readOrCreateDeviceId())

  useEffect(() => {
    let active = true

    async function loadBridgeStatus() {
      try {
        const response = await fetch('/api/auth-status')
        const payload = await parseJsonSafe(response)
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load secure account status.')
        }

        if (!active) return
        setBridgeStatus({
          loading: false,
          legacyAccessEnabled: Boolean(payload.legacyAccessEnabled),
          secureAccountsEnabled: Boolean(payload.secureAccountsEnabled),
          customAuthEmailsEnabled: Boolean(payload.customAuthEmailsEnabled),
          deviceLimit: Number(payload.deviceLimit || 2),
          authMode: payload.authMode || 'legacy_only',
          supabase: payload.supabase || null,
        })
        setStatusError('')
      } catch (err) {
        if (!active) return
        setStatusError(err.message || 'Unable to load secure account status.')
        setBridgeStatus(prev => ({ ...prev, loading: false }))
      }
    }

    loadBridgeStatus()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!bridgeStatus.secureAccountsEnabled || !bridgeStatus.supabase?.url || !bridgeStatus.supabase?.anonKey) {
      setSupabase(null)
      setSecureSession(null)
      setSecureUser(null)
      setDeviceReplacementCooldown(null)
      return undefined
    }

    let active = true
    const client = createClient(bridgeStatus.supabase.url, bridgeStatus.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    setSupabase(client)

    async function bootstrapSession() {
      const hashParams = readAuthHashParams()
      const queryParams = readAuthQueryParams()
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const authCode = queryParams.get('code')
      const tokenHash = queryParams.get('token_hash')
      const authType = queryParams.get('type')
      const redirectError = (
        hashParams.get('error_description')
        || hashParams.get('error')
        || queryParams.get('error_description')
        || queryParams.get('error')
      )

      if (redirectError) {
        setStatusError(redirectError)
        clearAuthRedirectState()
      }

      if (accessToken && refreshToken) {
        const { data, error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!active) return

        if (error) {
          setStatusError(error.message || 'Unable to finish secure sign-in from that magic link.')
        } else {
          setSecureSession(data.session || null)
          setSecureUser(data.session?.user || null)
          setMagicLinkSentTo('')
          setStatusError('')
        }

        clearAuthRedirectState()
        if (!error && data.session) {
          completePostAuthNavigation()
        }
        return
      }

      if (authCode) {
        const { data, error } = await client.auth.exchangeCodeForSession(authCode)

        if (!active) return

        if (error) {
          setStatusError(error.message || 'Unable to finish secure sign-in from that magic link.')
        } else {
          setSecureSession(data.session || null)
          setSecureUser(data.session?.user || null)
          setMagicLinkSentTo('')
          setStatusError('')
        }

        clearAuthRedirectState()
        if (!error && data.session) {
          completePostAuthNavigation()
        }
        return
      }

      if (tokenHash && authType) {
        const { data, error } = await client.auth.verifyOtp({
          token_hash: tokenHash,
          type: authType,
        })

        if (!active) return

        if (error) {
          setStatusError(error.message || 'Unable to finish secure sign-in from that magic link.')
        } else {
          setSecureSession(data.session || null)
          setSecureUser(data.session?.user || null)
          setMagicLinkSentTo('')
          setStatusError('')
        }

        clearAuthRedirectState()
        if (!error && data.session) {
          completePostAuthNavigation()
        }
        return
      }

      const { data } = await client.auth.getSession()
      if (!active) return
      setSecureSession(data.session || null)
      setSecureUser(data.session?.user || null)
    }

    bootstrapSession().catch(err => {
      if (!active) return
      setStatusError(err.message || 'Unable to finish secure sign-in right now.')
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setSecureSession(session || null)
      setSecureUser(session?.user || null)
      if (session) {
        setMagicLinkSentTo('')
        completePostAuthNavigation()
      }
      if (!session) {
        setSecureAccount(null)
        setSecureDevices([])
        setDeviceReplacementCooldown(null)
      }
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [bridgeStatus.secureAccountsEnabled, bridgeStatus.supabase?.anonKey, bridgeStatus.supabase?.url])

  async function refreshSecureAccount(nextAccessToken = secureSession?.access_token) {
    if (!nextAccessToken) {
      setSecureAccount(null)
      setSecureDevices([])
      setDeviceReplacementCooldown(null)
      return null
    }

    setLoadingAccount(true)
    try {
      const response = await fetch('/api/account-status', {
        headers: {
          Authorization: `Bearer ${nextAccessToken}`,
          'X-Device-Id': deviceId,
        },
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load secure account status.')
      }

      setSecureAccount(payload.account || null)
      setSecureDevices(payload.devices || [])
      setDeviceReplacementCooldown(payload.deviceReplacementCooldown || null)
      setAccountError(
        payload.deviceApproval && payload.deviceApproval.ok === false
          ? payload.deviceApproval.message || 'This device is not approved for secure JobSensei access yet.'
          : '',
      )
      return payload
    } catch (err) {
      setAccountError(err.message || 'Unable to load secure account status.')
      throw err
    } finally {
      setLoadingAccount(false)
    }
  }

  useEffect(() => {
    if (!secureSession?.access_token) {
      setSecureAccount(null)
      setSecureDevices([])
      return
    }

    refreshSecureAccount(secureSession.access_token).catch(() => {})
  }, [secureSession?.access_token])

  async function sendMagicLink(email) {
    if (!supabase) {
      throw new Error('Secure account sync is not enabled yet.')
    }

    setSendingMagicLink(true)
    try {
      const redirectTo = getMagicLinkRedirectUrl()
      rememberPostAuthSection('settings')

      if (bridgeStatus.customAuthEmailsEnabled) {
        const response = await fetch('/api/send-magic-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            redirectTo,
          }),
        })
        const payload = await parseJsonSafe(response)

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to send a secure sign-in link right now.')
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        })

        if (error) throw error
      }

      setMagicLinkSentTo(email)
      setStatusError('')
    } finally {
      setSendingMagicLink(false)
    }
  }

  async function signOutSecure() {
    if (!supabase) return
    await supabase.auth.signOut()
    setMagicLinkSentTo('')
  }

  async function linkCurrentAccess({ legacyToken, legacyCode = '', deviceName = '', deviceLabel = '' }) {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your secure account first.')
    }

    setLinkingAccess(true)
    try {
      const response = await fetch('/api/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secureSession.access_token}`,
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({
          legacyToken,
          legacyCode,
          deviceId,
          deviceName: deviceName || defaultDeviceName(),
          deviceLabel: deviceLabel || defaultDeviceName(),
        }),
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to link this access right now.')
      }

      await refreshSecureAccount(secureSession.access_token)
      return payload
    } finally {
      setLinkingAccess(false)
    }
  }

  async function revokeSecureDevice(targetDeviceId) {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your secure account first.')
    }

    setRevokingDeviceId(targetDeviceId)
    try {
      const response = await fetch('/api/revoke-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secureSession.access_token}`,
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify({
          deviceId: targetDeviceId,
        }),
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to revoke that device right now.')
      }

      setSecureDevices(payload.devices || [])
      return payload
    } finally {
      setRevokingDeviceId('')
    }
  }

  async function deleteSecureAccount(confirmEmail) {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your secure account first.')
    }

    setDeletingAccount(true)
    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secureSession.access_token}`,
        },
        body: JSON.stringify({
          confirmEmail,
        }),
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete this secure account right now.')
      }

      try {
        await supabase?.auth?.signOut?.()
      } catch {}

      setSecureSession(null)
      setSecureUser(null)
      setSecureAccount(null)
      setSecureDevices([])
      setDeviceReplacementCooldown(null)
      setMagicLinkSentTo('')

      return payload
    } finally {
      setDeletingAccount(false)
    }
  }

  async function exportSecureAccountData() {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your secure account first.')
    }

    setExportingAccountData(true)
    try {
      const response = await fetch('/api/export-account', {
        headers: {
          Authorization: `Bearer ${secureSession.access_token}`,
        },
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to export secure account data right now.')
      }

      return payload
    } finally {
      setExportingAccountData(false)
    }
  }

  const value = {
    bridgeStatus,
    statusError,
    secureReady: !bridgeStatus.loading,
    secureAccountsEnabled: bridgeStatus.secureAccountsEnabled,
    secureSession,
    secureUser,
    secureAccount,
    secureDevices,
    deviceReplacementCooldown,
    loadingAccount,
    accountError,
    sendingMagicLink,
    magicLinkSentTo,
    linkingAccess,
    revokingDeviceId,
    deletingAccount,
    exportingAccountData,
    deviceId,
    deviceLimit: bridgeStatus.deviceLimit,
    sendMagicLink,
    signOutSecure,
    refreshSecureAccount,
    linkCurrentAccess,
    revokeSecureDevice,
    deleteSecureAccount,
    exportSecureAccountData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
