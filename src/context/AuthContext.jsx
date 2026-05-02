import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const AuthContext = createContext(null)

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
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [sendingMagicLink, setSendingMagicLink] = useState(false)
  const [magicLinkSentTo, setMagicLinkSentTo] = useState('')
  const [linkingAccess, setLinkingAccess] = useState(false)
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

    client.auth.getSession().then(({ data }) => {
      if (!active) return
      setSecureSession(data.session || null)
      setSecureUser(data.session?.user || null)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setSecureSession(session || null)
      setSecureUser(session?.user || null)
      if (!session) {
        setSecureAccount(null)
        setSecureDevices([])
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
      return null
    }

    setLoadingAccount(true)
    try {
      const response = await fetch('/api/account-status', {
        headers: {
          Authorization: `Bearer ${nextAccessToken}`,
        },
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load secure account status.')
      }

      setSecureAccount(payload.account || null)
      setSecureDevices(payload.devices || [])
      setAccountError('')
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) throw error
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

  const value = {
    bridgeStatus,
    statusError,
    secureReady: !bridgeStatus.loading,
    secureAccountsEnabled: bridgeStatus.secureAccountsEnabled,
    secureSession,
    secureUser,
    secureAccount,
    secureDevices,
    loadingAccount,
    accountError,
    sendingMagicLink,
    magicLinkSentTo,
    linkingAccess,
    deviceId,
    deviceLimit: bridgeStatus.deviceLimit,
    sendMagicLink,
    signOutSecure,
    refreshSecureAccount,
    linkCurrentAccess,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
