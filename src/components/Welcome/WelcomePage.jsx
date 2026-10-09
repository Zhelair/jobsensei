import React, { useEffect, useRef, useState } from 'react'
import { useApp, SECTIONS } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { THEMES, useTheme } from '../../context/ThemeContext'
import {
  ArrowRight, CheckCircle2, CreditCard, ExternalLink,
} from 'lucide-react'
import { openProCheckout } from '../../lib/billing'
import ProductStory from './ProductStory'

export default function WelcomePage() {
  const { skipOnboarding, openOnboarding, setActiveSection } = useApp()
  const { unlockAccess } = useAI()
  const { secureUser, secureAccount, secureAccountsEnabled, secureSession, signInWithGoogle } = useAuth()
  const { language, t } = useLanguage()
  const { theme } = useTheme()

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
  const isDaylight = theme === THEMES.DAYLIGHT
  const accessRoutes = [
    {
      key: 'free',
      title: t('welcome.accessWayFreeTitle'),
      copy: t('welcome.accessWayFreeCopy'),
      accent: 'text-teal-200 border-teal-500/20 bg-teal-500/10',
      price: t('onboarding.freePrice'),
      suffix: t('onboarding.perMonth'),
    },
    {
      key: 'paddle',
      title: t('welcome.accessWayPaddleTitle'),
      copy: t('welcome.accessWayPaddleCopy'),
      accent: 'text-yellow-200 border-yellow-500/20 bg-yellow-500/10',
      price: t('onboarding.proPrice'),
      suffix: t('onboarding.perMonth'),
    },
    {
      key: 'byok',
      title: t('welcome.accessWayByokTitle'),
      copy: t('welcome.accessWayByokCopy'),
      accent: 'text-indigo-200 border-indigo-500/20 bg-indigo-500/10',
      price: t('welcome.accessWayByokPrice'),
      suffix: '',
    },
  ]
  const legalLinks = [
    { href: `/pricing.html?lang=${language}`, label: t('settings.pricingLink') },
    { href: `/refund-policy.html?lang=${language}`, label: t('settings.refundPolicyLink') },
    { href: `/terms-and-conditions.html?lang=${language}`, label: t('settings.termsConditionsLink') },
    { href: `/privacy-policy.html?lang=${language}`, label: t('settings.privacyPolicyLink') },
  ]

  const heroStyle = isDaylight
    ? {
        background: 'linear-gradient(135deg, rgba(240,248,245,0.98), rgba(252,248,243,0.98))',
        boxShadow: '0 24px 56px rgba(80, 60, 40, 0.12)',
      }
    : undefined
  const heroGlowStyle = isDaylight
    ? {
        background: 'radial-gradient(circle at top right, rgba(13,148,136,0.14), transparent 32%), radial-gradient(circle at bottom left, rgba(226,114,91,0.12), transparent 28%)',
      }
    : undefined

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
      setAccessError(error.message || 'Unable to open Paddle checkout right now.')
    }
  }

  function handleByokOpen() {
    skipOnboarding()
    window.setTimeout(() => {
      setActiveSection(SECTIONS.SETTINGS)
      window.dispatchEvent(new CustomEvent('jobsensei:open-byok-settings'))
    }, 80)
  }

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-6xl mx-auto animate-in space-y-6">
      <section
        className={`relative overflow-hidden rounded-[32px] border p-6 md:p-8 xl:p-10 ${
          isDaylight
            ? 'border-teal-500/20 bg-navy-900/90'
            : 'border-teal-500/20 bg-gradient-to-br from-navy-900 via-navy-950 to-teal-950/40'
        }`}
        style={heroStyle}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={heroGlowStyle}
        />
        {!isDaylight && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.12),transparent_28%)] pointer-events-none" />
        )}
        <div className="relative grid xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] gap-6 items-start">
          <div>
            <h1 className="font-display font-bold text-white text-3xl md:text-5xl leading-tight">
              {t('welcome.productTitle')}
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed mt-4 max-w-3xl">
              {t('welcome.productSubtitle')}
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={focusAccess} className="btn-primary text-sm md:text-base">
                {t('onboarding.freeCta')}
              </button>
              <button onClick={skipOnboarding} className="btn-secondary text-sm md:text-base">{t('welcome.exploreWorkspace')}</button>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mt-4">{t('welcome.localPrivacy')}</p>
          </div>

          <figure className="rounded-3xl border border-navy-600 bg-navy-950/50 p-3 md:p-4">
            <img src="/product-previews/workspace.png" alt={t('welcome.chapter.roles.title')} className="w-full rounded-2xl border border-navy-600" width="1040" height="620" />
            <figcaption className="text-slate-400 text-xs leading-relaxed mt-3">{t('welcome.sampleCaption')}</figcaption>
          </figure>
        </div>
      </section>

      <ProductStory />
      <section aria-label={t('welcome.accessTitle')}>
          <div ref={accessSectionRef} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5 md:p-6">
            <div className="text-slate-500 text-xs font-display font-semibold uppercase tracking-[0.16em] mb-2">
              {t('welcome.accessKicker')}
            </div>
            <h2 className="font-display font-semibold text-white text-2xl">{t('welcome.accessTitle')}</h2>
            <p className="text-slate-300 text-sm leading-relaxed mt-2">{t('welcome.accessCopy')}</p>

            <label className="text-sm text-slate-400 mt-4 mb-1.5 block">{t('onboarding.emailLabel')}</label>
            <input
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

            <div className="grid gap-2 mt-3 md:grid-cols-3">
              <button
                onClick={handleAccessStart}
                disabled={accessLoading}
                className="btn-primary justify-center"
              >
                <CheckCircle2 size={14} /> {accessLoading ? t('settings.activating') : t('onboarding.freeCta')}
              </button>
              <button
                onClick={handleCheckoutOpen}
                className="btn-secondary justify-center border-yellow-500/30 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
              >
                <CreditCard size={14} /> {t('onboarding.proCta')}
              </button>
              <button
                onClick={handleByokOpen}
                className="btn-secondary justify-center border-indigo-500/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20"
              >
                {t('welcome.ctaByok')}
              </button>
            </div>

            {!secureUser && secureAccountsEnabled && <button className="btn-secondary w-full justify-center mt-3" onClick={async () => {
              try { await signInWithGoogle() } catch (error) { setAccessError(error.message) }
            }}>{t('settings.googleSignIn')}</button>}
            <p className="text-slate-400 text-sm mt-3">{t('welcome.localPrivacy')}</p>
            <div className="grid gap-3 mt-5 md:grid-cols-3">
              {accessRoutes.map(route => (
                <div key={route.key} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <div className="text-white text-base font-display font-semibold mb-3">{route.title}</div>
                  <div className="text-white text-[32px] font-display font-bold leading-none">{route.price}</div>
                  {route.suffix && <div className="text-slate-500 text-xs mt-1">{route.suffix}</div>}
                  <p className="text-slate-400 text-sm leading-relaxed mt-3">{route.copy}</p>
                </div>
              ))}
            </div>

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

      <section className="card flex flex-wrap items-center gap-2">
        <div className="text-slate-500 text-sm mr-2">{t('welcome.footerCopy')}</div>
        {legalLinks.map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
            <ExternalLink size={13} /> {link.label}
          </a>
        ))}
      </section>
    </div>
  )
}
