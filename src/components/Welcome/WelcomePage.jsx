import React, { useEffect, useRef, useState } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  ArrowRight, CheckCircle2,
} from 'lucide-react'
import { openProCheckout } from '../../lib/billing'
import HomeLayout from './HomeLayout'

export default function WelcomePage() {
  const { skipOnboarding, openOnboarding, setActiveSection } = useApp()
  const { unlockAccess } = useAI()
  const { secureUser, secureAccount, secureAccountsEnabled, secureSession, signInWithGoogle } = useAuth()
  const { language, t } = useLanguage()

  const accessSectionRef = useRef(null)
  const emailInputRef = useRef(null)
  const [accessInput, setAccessInput] = useState(String(secureUser?.email || secureAccount?.email || '').trim())
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [accessNotice, setAccessNotice] = useState('')
  const [legacyUnlocked, setLegacyUnlocked] = useState(false)
  const accessReady = secureAccountsEnabled
    ? Boolean(secureUser && secureAccount?.planActive)
    : legacyUnlocked
  const legalLinks = [
    { href: `/pricing.html?lang=${language}`, label: t('settings.pricingLink') },
    { href: `/refund-policy.html?lang=${language}`, label: t('settings.refundPolicyLink') },
    { href: `/terms-and-conditions.html?lang=${language}`, label: t('settings.termsConditionsLink') },
    { href: `/privacy-policy.html?lang=${language}`, label: t('settings.privacyPolicyLink') },
  ]

  useEffect(() => {
    const nextEmail = String(secureUser?.email || secureAccount?.email || '').trim()
    if (nextEmail) setAccessInput(nextEmail)
  }, [secureAccount?.email, secureUser?.email])

  function focusAccess() {
    accessSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      emailInputRef.current?.focus()
    }, 220)
  }

  async function handleAccessStart() {
    if (!accessInput.trim()) {
      focusAccess()
      return
    }

    setAccessLoading(true)
    setAccessError('')
    setAccessNotice('')
    try {
      const result = await unlockAccess(accessInput.trim())
      if (result?.mode === 'magic_link') {
        skipOnboarding()
        return
      } else {
        setLegacyUnlocked(true)
        setAccessNotice(t('settings.unlockCodeAccepted'))
      }
    } catch (error) {
      setAccessError(error.message || 'Unable to activate access right now.')
    } finally {
      setAccessLoading(false)
    }
  }

  async function handleCheckoutOpen() {
    setAccessError('')
    setAccessNotice('')

    try {
      await openProCheckout({
        email: accessInput.trim(),
        userId: secureUser?.id || '',
        accessToken: secureSession?.access_token || '',
      })
    } catch (error) {
      focusAccess()
      setAccessError(error.message || 'Unable to open Paddle checkout right now.')
    }
  }

  function handleByokOpen() {
    if (!secureUser) {
      setAccessNotice(t('access.byokCopy'))
      focusAccess()
      return
    }
    skipOnboarding()
    window.setTimeout(() => {
      setActiveSection(SECTIONS.SETTINGS)
      window.dispatchEvent(new CustomEvent('jobsensei:open-byok-settings'))
    }, 80)
  }

  return (
    <HomeLayout onStart={focusAccess} onExplore={skipOnboarding} onPro={handleCheckoutOpen} onByok={handleByokOpen} legalLinks={legalLinks}>
      <section aria-label={t('welcome.accessTitle')}>
          <div ref={accessSectionRef} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 md:p-6">
            <div className="text-slate-500 text-xs font-display font-semibold uppercase tracking-[0.16em] mb-2">
              {t('welcome.accessKicker')}
            </div>
            <h2 className="font-display font-semibold text-white text-2xl">{t('welcome.accessTitle')}</h2>
            <p className="text-slate-300 text-sm leading-relaxed mt-2">{t('welcome.accessCopy')}</p>

            <label htmlFor="home-access-email" className="text-sm text-slate-400 mt-4 mb-1.5 block">{t('onboarding.emailLabel')}</label>
            <input
              id="home-access-email"
              ref={emailInputRef}
              className="input-field text-sm"
              type="email"
              placeholder={t('onboarding.emailPlaceholder')}
              value={accessInput}
              onChange={event => {
                setAccessInput(event.target.value)
                setAccessError('')
                setAccessNotice('')
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') handleAccessStart()
              }}
            />

            <p className="text-slate-400 text-sm mt-2">{t('access.passwordless')}</p>
            <div className="home-signin-actions grid gap-2 mt-3">
              <button
                onClick={handleAccessStart}
                disabled={accessLoading}
                className="btn-primary justify-center"
              >
                <CheckCircle2 size={14} /> {accessLoading ? t('settings.activating') : t('onboarding.freeCta')}
              </button>
            </div>

            {!secureUser && secureAccountsEnabled && <button className="btn-secondary w-full justify-center mt-2 home-google-signin" onClick={async () => {
              try { await signInWithGoogle() } catch (error) { setAccessError(error.message) }
            }}>{t('settings.googleSignIn')}</button>}
            {!secureUser && secureAccountsEnabled && <p className="text-slate-400 text-sm mt-2">{t('access.googlePurpose')}</p>}
            <p className="text-slate-400 text-sm mt-3">{t('welcome.localPrivacy')}</p>
            {accessReady && (
              <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                <div className="flex items-center gap-2 text-green-300 text-sm font-display font-semibold">
                  <CheckCircle2 size={15} /> {t('onboarding.accessReady')}
                </div>
                <div className="text-slate-200 text-sm leading-relaxed mt-1">
                  {secureUser?.email || secureAccount?.email || accessInput}
                </div>
                <div className="text-slate-400 text-sm leading-relaxed mt-1">
                  {t('onboarding.accessReadyCopy')}
                </div>
                <button onClick={() => openOnboarding('profile')} className="btn-primary mt-4 justify-center">
                  {t('welcome.ctaContinue')} <ArrowRight size={14} />
                </button>
              </div>
            )}

            {accessNotice && <p className="text-green-400 text-sm leading-relaxed mt-3">{accessNotice}</p>}
            {accessError && <p className="text-red-400 text-sm leading-relaxed mt-3">{accessError}</p>}
          </div>
      </section>

    </HomeLayout>
  )
}
