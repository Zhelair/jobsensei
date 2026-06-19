import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  POST_AUTH_SECTION_STORAGE_KEY,
  hasAuthCallbackParams,
  pickMagicLinkRedirectUrl,
} from '../lib/authFlow'

const AuthContext = createContext(null)
const SECURE_DEVICE_ID_STORAGE_KEY = 'js_secure_device_id'
const PLAN_SNAPSHOT_STORAGE_KEY = 'js_secure_plan_snapshot'
const PLAN_EXPIRED_NOTICE_STORAGE_KEY = 'js_secure_plan_expired_notice'

function createSecureDeviceId() {
  if (window.crypto?.randomUUID) {
    return `js-${window.crypto.randomUUID()}`
  }

  return `js-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function detectBrowserLabel() {
  const userAgent = navigator.userAgent || ''
  if (/edg/i.test(userAgent)) return 'Edge'
  if (/chrome|crios/i.test(userAgent)) return 'Chrome'
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox'
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return 'Safari'
  return 'Browser'
}

function detectPlatformLabel() {
  const userAgentDataPlatform = navigator.userAgentData?.platform || ''
  const platform = navigator.platform || userAgentDataPlatform || ''
  const source = `${platform} ${navigator.userAgent || ''}`.toLowerCase()

  if (source.includes('iphone')) return 'iPhone'
  if (source.includes('ipad')) return 'iPad'
  if (source.includes('android')) return 'Android'
  if (source.includes('mac')) return 'Mac'
  if (source.includes('win')) return 'Windows'
  if (source.includes('linux')) return 'Linux'
  return 'Device'
}

function getOrCreateSecureDevice() {
  const savedId = localStorage.getItem(SECURE_DEVICE_ID_STORAGE_KEY)
  const deviceId = savedId || createSecureDeviceId()
  if (!savedId) {
    localStorage.setItem(SECURE_DEVICE_ID_STORAGE_KEY, deviceId)
  }

  return {
    deviceId,
    deviceName: `${detectPlatformLabel()} - ${detectBrowserLabel()}`,
  }
}

function buildSecureDeviceHeaders(secureDevice) {
  if (!secureDevice?.deviceId) return {}

  return {
    'X-JobSensei-Device-Id': secureDevice.deviceId,
    'X-JobSensei-Device-Name': secureDevice.deviceName || '',
  }
}

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

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function parseStoredJson(value, fallback = null) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeAuthMessage(message, { customAuthEmailsEnabled = false } = {}) {
  const text = String(message || '').trim()
  if (!text) return ''

  if (/email rate limit exceeded/i.test(text)) {
    return customAuthEmailsEnabled
      ? 'Too many email requests were sent. Please wait a minute and try again.'
      : 'Supabase email rate limit exceeded. Add Resend to use branded emails without this dev limit.'
  }

  if (/invalid.*expired|expired.*invalid|otp_expired|token has expired/i.test(text)) {
    return 'This sign-in link was already used or expired. Request a new magic link and open the newest email.'
  }

  return text
}

export function AuthProvider({ children }) {
  const [secureDevice] = useState(() => getOrCreateSecureDevice())
  const [bridgeStatus, setBridgeStatus] = useState({
    loading: true,
    legacyAccessEnabled: false,
    secureAccountsEnabled: false,
    customAuthEmailsEnabled: false,
    authMode: 'legacy_only',
    supabase: null,
  })
  const [statusError, setStatusError] = useState('')
  const [supabase, setSupabase] = useState(null)
  const [secureSession, setSecureSession] = useState(null)
  const [secureUser, setSecureUser] = useState(null)
  const [secureAccount, setSecureAccount] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [sendingMagicLink, setSendingMagicLink] = useState(false)
  const [magicLinkSentTo, setMagicLinkSentTo] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exportingAccountData, setExportingAccountData] = useState(false)
  const [revokingDeviceId, setRevokingDeviceId] = useState('')
  const [planExpiredNotice, setPlanExpiredNotice] = useState(null)

  useEffect(() => {
    let active = true

    async function loadBridgeStatus() {
      try {
        const response = await fetch('/api/auth-status')
        const payload = await parseJsonSafe(response)
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load account access status.')
        }

        if (!active) return
        setBridgeStatus({
          loading: false,
          legacyAccessEnabled: Boolean(payload.legacyAccessEnabled),
          secureAccountsEnabled: Boolean(payload.secureAccountsEnabled),
          customAuthEmailsEnabled: Boolean(payload.customAuthEmailsEnabled),
          authMode: payload.authMode || 'legacy_only',
          supabase: payload.supabase || null,
        })
        setStatusError('')
      } catch (err) {
        if (!active) return
        setStatusError(err.message || 'Unable to load account access status.')
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
        setStatusError(normalizeAuthMessage(redirectError, {
          customAuthEmailsEnabled: bridgeStatus.customAuthEmailsEnabled,
        }))
        clearAuthRedirectState()
      }

      if (accessToken && refreshToken) {
        const { data, error } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!active) return

        if (error) {
          setStatusError(normalizeAuthMessage(
            error.message || 'Unable to finish secure sign-in from that magic link.',
            { customAuthEmailsEnabled: bridgeStatus.customAuthEmailsEnabled },
          ))
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
          setStatusError(normalizeAuthMessage(
            error.message || 'Unable to finish secure sign-in from that magic link.',
            { customAuthEmailsEnabled: bridgeStatus.customAuthEmailsEnabled },
          ))
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
          setStatusError(normalizeAuthMessage(
            error.message || 'Unable to finish secure sign-in from that magic link.',
            { customAuthEmailsEnabled: bridgeStatus.customAuthEmailsEnabled },
          ))
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
      setStatusError(err.message || 'Unable to finish sign-in right now.')
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
      }
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [
    bridgeStatus.customAuthEmailsEnabled,
    bridgeStatus.secureAccountsEnabled,
    bridgeStatus.supabase?.anonKey,
    bridgeStatus.supabase?.url,
  ])

  async function refreshSecureAccount(nextAccessToken = secureSession?.access_token) {
    if (!nextAccessToken) {
      setSecureAccount(null)
      return null
    }

    setLoadingAccount(true)
    try {
      const response = await fetch('/api/account-status', {
        headers: {
          Authorization: `Bearer ${nextAccessToken}`,
          ...buildSecureDeviceHeaders(secureDevice),
        },
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load account access status.')
      }

      setSecureAccount(payload.account || null)
      setAccountError('')
      return payload
    } catch (err) {
      setAccountError(err.message || 'Unable to load account access status.')
      throw err
    } finally {
      setLoadingAccount(false)
    }
  }

  useEffect(() => {
    if (!secureSession?.access_token) {
      setSecureAccount(null)
      return
    }

    refreshSecureAccount(secureSession.access_token).catch(() => {})
  }, [secureDevice, secureSession?.access_token])

  useEffect(() => {
    if (!secureAccount?.email) return

    const currentSnapshot = {
      email: secureAccount.email,
      planTier: secureAccount.planTier || null,
      planActive: Boolean(secureAccount.planActive),
      planExpiresAt: secureAccount.planExpiresAt || null,
    }
    const previousSnapshot = parseStoredJson(localStorage.getItem(PLAN_SNAPSHOT_STORAGE_KEY), null)
    const dismissedNoticeId = localStorage.getItem(PLAN_EXPIRED_NOTICE_STORAGE_KEY) || ''
    const wasActivePro = Boolean(
      previousSnapshot
      && previousSnapshot.email === currentSnapshot.email
      && previousSnapshot.planActive
      && previousSnapshot.planTier === 'pro',
    )
    const isActiveFree = Boolean(currentSnapshot.planActive && currentSnapshot.planTier === 'free')
    const noticeId = wasActivePro
      ? `${currentSnapshot.email}:${previousSnapshot.planExpiresAt || 'pro'}`
      : ''

    if (wasActivePro && isActiveFree && noticeId && dismissedNoticeId !== noticeId) {
      setPlanExpiredNotice({
        id: noticeId,
        email: currentSnapshot.email,
        previousExpiresAt: previousSnapshot.planExpiresAt || null,
      })
    }

    localStorage.setItem(PLAN_SNAPSHOT_STORAGE_KEY, JSON.stringify(currentSnapshot))
  }, [secureAccount])

  async function sendMagicLink(email) {
    if (!supabase) {
      throw new Error('Email sign-in is not enabled yet.')
    }

    setSendingMagicLink(true)
    setStatusError('')
    setAccountError('')
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
          throw new Error(payload.error || 'Unable to send a sign-in link right now.')
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        })

        if (error) {
          throw new Error(normalizeAuthMessage(error.message, {
            customAuthEmailsEnabled: bridgeStatus.customAuthEmailsEnabled,
          }))
        }
      }

      setMagicLinkSentTo(email)
      setStatusError('')
      return { ok: true, email }
    } finally {
      setSendingMagicLink(false)
    }
  }

  async function signOutSecure() {
    if (!supabase) return
    await supabase.auth.signOut()
    setMagicLinkSentTo('')
    setStatusError('')
    setAccountError('')
  }

  async function deleteSecureAccount(confirmEmail) {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your account first.')
    }

    setDeletingAccount(true)
    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secureSession.access_token}`,
            ...buildSecureDeviceHeaders(secureDevice),
          },
        body: JSON.stringify({
          confirmEmail,
        }),
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete this account right now.')
      }

      try {
        await supabase?.auth?.signOut?.()
      } catch {}

      setSecureSession(null)
      setSecureUser(null)
      setSecureAccount(null)
      setMagicLinkSentTo('')

      return payload
    } finally {
      setDeletingAccount(false)
    }
  }

  async function exportSecureAccountData() {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your account first.')
    }

    setExportingAccountData(true)
    try {
      const response = await fetch('/api/export-account', {
        headers: {
          Authorization: `Bearer ${secureSession.access_token}`,
          ...buildSecureDeviceHeaders(secureDevice),
        },
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to export account data right now.')
      }

      return payload
    } finally {
      setExportingAccountData(false)
    }
  }

  async function revokeSecureDevice(deviceId) {
    if (!secureSession?.access_token) {
      throw new Error('Sign in to your account first.')
    }

    setRevokingDeviceId(deviceId)
    try {
      const response = await fetch('/api/revoke-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secureSession.access_token}`,
          ...buildSecureDeviceHeaders(secureDevice),
        },
        body: JSON.stringify({
          deviceId,
        }),
      })
      const payload = await parseJsonSafe(response)

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to unlink this device right now.')
      }

      await refreshSecureAccount(secureSession.access_token)
      return payload
    } finally {
      setRevokingDeviceId('')
    }
  }

  function dismissPlanExpiredNotice() {
    if (planExpiredNotice?.id) {
      localStorage.setItem(PLAN_EXPIRED_NOTICE_STORAGE_KEY, planExpiredNotice.id)
    }
    setPlanExpiredNotice(null)
  }

  const value = {
    bridgeStatus,
    statusError,
    secureReady: !bridgeStatus.loading,
    secureAccountsEnabled: bridgeStatus.secureAccountsEnabled,
    secureSession,
    secureUser,
    secureAccount,
    loadingAccount,
    accountError,
    sendingMagicLink,
    magicLinkSentTo,
    deletingAccount,
    exportingAccountData,
    revokingDeviceId,
    planExpiredNotice,
    secureDevice,
    sendMagicLink,
    signOutSecure,
    refreshSecureAccount,
    deleteSecureAccount,
    exportSecureAccountData,
    revokeSecureDevice,
    dismissPlanExpiredNotice,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
