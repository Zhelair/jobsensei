import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { THEMES, useTheme } from '../../context/ThemeContext'
import {
  ArrowRight, CheckCircle2, Coffee, CreditCard, ExternalLink,
  Image as ImageIcon, PlayCircle, Briefcase, Search, Sparkles,
} from 'lucide-react'
import { BMAC_ENABLED, openBmacCheckout, openProCheckout } from '../../lib/billing'

function OutcomeCard({ icon: Icon, title, copy, accent, iconTone }) {
  return (
    <div className={`card h-full border ${accent}`}>
      <div className={`w-11 h-11 rounded-2xl border border-white/5 flex items-center justify-center mb-4 ${iconTone}`}>
        <Icon size={18} className="text-white" />
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{copy}</p>
    </div>
  )
}

function StepCard({ number, title, copy }) {
  return (
    <div className="rounded-2xl border border-navy-600 bg-navy-900/60 px-4 py-4 h-full">
      <div className="text-teal-300 text-[11px] font-display font-semibold uppercase tracking-[0.18em] mb-2">
        {number}
      </div>
      <h3 className="font-display font-semibold text-white mb-1">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{copy}</p>
    </div>
  )
}

function PreviewPanel({ title, copy, chips = [], steps = [], isDaylight = false }) {
  const shellStyle = isDaylight
    ? {
        background: 'linear-gradient(160deg, rgba(255,255,255,0.72), rgba(240,248,245,0.92))',
        boxShadow: '0 18px 40px rgba(80, 60, 40, 0.10)',
      }
    : undefined

  return (
    <div
      className={`rounded-3xl border p-4 ${isDaylight ? 'border-teal-500/20 bg-navy-900/70' : 'border-navy-600 bg-navy-900/65'}`}
      style={shellStyle}
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        {chips.map(chip => (
          <span key={chip} className="px-2.5 py-1 rounded-full text-[11px] border border-teal-500/20 bg-teal-500/10 text-teal-200">
            {chip}
          </span>
        ))}
      </div>
      <div className={`rounded-[28px] border overflow-hidden ${
        isDaylight
          ? 'border-teal-500/15 bg-white/80'
          : 'border-white/5 bg-white/[0.03]'
      }`}>
        <div className="aspect-[16/10] px-4 py-4 md:px-5 md:py-5 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-display mb-1">Product preview</div>
              <div className="text-white text-sm font-display font-semibold">Ready for one short GIF or three screenshots</div>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <PlayCircle size={16} />
              <ImageIcon size={16} />
            </div>
          </div>
          <div className={`mt-4 flex-1 rounded-2xl border p-4 md:p-5 flex flex-col justify-between ${
            isDaylight
              ? 'border-teal-500/15 bg-white/75'
              : 'border-white/5 bg-white/[0.03]'
          }`}>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-display mb-2">Flow preview</div>
              <h3 className="font-display font-semibold text-white text-xl mb-2">{title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{copy}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {steps.map((step, index) => (
                <div key={step} className="rounded-xl border border-white/5 bg-white/[0.04] h-20 px-3 py-3 flex flex-col justify-between">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-display">
                    Step {index + 1}
                  </div>
                  <div className="text-sm text-white font-display font-semibold">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  const { skipOnboarding, openOnboarding } = useApp()
  const { unlockAccess } = useAI()
  const { secureUser, secureAccount, secureAccountsEnabled } = useAuth()
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
    ...(BMAC_ENABLED
      ? [{
          key: 'bmac',
          title: t('welcome.accessWayBmacTitle'),
          copy: t('welcome.accessWayBmacCopy'),
          accent: 'text-indigo-200 border-indigo-500/20 bg-indigo-500/10',
          price: 'BMAC',
          suffix: '',
        }]
      : []),
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
      })
    } catch (error) {
      setAccessError(error.message || 'Unable to open Paddle checkout right now.')
    }
  }

  function handleBmacCheckout() {
    setAccessError('')
    setAccessNotice('')

    try {
      openBmacCheckout()
    } catch (error) {
      setAccessError(error.message || 'Unable to open Buy Me a Coffee right now.')
    }
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
        <div className="relative grid xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-200 text-xs font-display font-semibold uppercase tracking-[0.18em]">
              {t('welcome.badge')}
            </div>
            <h1 className="font-display font-bold text-white text-3xl md:text-5xl leading-tight mt-4">
              {t('welcome.title')}
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed mt-4 max-w-3xl">
              {t('welcome.subtitle')}
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={focusAccess} className="btn-primary text-sm md:text-base">
                <CheckCircle2 size={16} /> {t('welcome.ctaFree')}
              </button>
              <button onClick={handleCheckoutOpen} className="btn-secondary text-sm md:text-base border-yellow-500/30 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20">
                <CreditCard size={16} /> {t('welcome.ctaPro')}
              </button>
              <button onClick={skipOnboarding} className="btn-ghost text-sm md:text-base">
                {t('welcome.ctaSkip')}
              </button>
            </div>
          </div>

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

            <div className="grid gap-2 mt-3 sm:grid-cols-2">
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
              {BMAC_ENABLED && (
                <button
                  onClick={handleBmacCheckout}
                  className="btn-secondary justify-center border-indigo-500/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20 sm:col-span-2"
                >
                  <Coffee size={14} /> {t('welcome.ctaBmac')}
                </button>
              )}
            </div>

            <div className="space-y-3 mt-5">
              {accessRoutes.map(route => (
                <div key={route.key} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-base font-display font-semibold">{route.title}</div>
                      <p className="text-slate-400 text-sm leading-relaxed mt-1">{route.copy}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`px-2.5 py-1 rounded-full text-[11px] border inline-flex ${route.accent}`}>
                        {route.title}
                      </div>
                      <div className="text-white text-2xl font-display font-bold mt-2 leading-none">{route.price}</div>
                      {route.suffix && <div className="text-slate-500 text-xs mt-1">{route.suffix}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mt-4">{t('onboarding.sameEmailHint')}</p>
            <p className="text-slate-500 text-sm leading-relaxed mt-2">{t('onboarding.legacySupportNote')}</p>

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
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <OutcomeCard
          icon={Sparkles}
          title={t('welcome.outcomeTailorTitle')}
          copy={t('welcome.outcomeTailorCopy')}
          accent="border-teal-500/20 bg-teal-500/6"
          iconTone="bg-teal-500/10"
        />
        <OutcomeCard
          icon={Search}
          title={t('welcome.outcomePrepTitle')}
          copy={t('welcome.outcomePrepCopy')}
          accent="border-indigo-500/20 bg-indigo-500/6"
          iconTone="bg-indigo-500/10"
        />
        <OutcomeCard
          icon={Briefcase}
          title={t('welcome.outcomeTrackTitle')}
          copy={t('welcome.outcomeTrackCopy')}
          accent="border-yellow-500/20 bg-yellow-500/6"
          iconTone="bg-yellow-500/10"
        />
      </section>

      <section className="card">
        <PreviewPanel
          title={t('welcome.previewPrimaryTitle')}
          copy={t('welcome.previewPrimaryCopy')}
          chips={[t('welcome.previewChipRole'), t('welcome.previewChipNotes'), t('welcome.previewChipTracker')]}
          steps={[t('welcome.previewStepRole'), t('welcome.previewStepResearch'), t('welcome.previewStepPrep')]}
          isDaylight={isDaylight}
        />
      </section>

      <section className="card">
        <div className="text-teal-300 text-[11px] font-display font-semibold uppercase tracking-[0.18em] mb-2">
          {t('welcome.howKicker')}
        </div>
        <h2 className="font-display font-semibold text-white text-2xl mb-4">{t('welcome.howTitle')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <StepCard number="1" title={t('welcome.stepResumeTitle')} copy={t('welcome.stepResumeCopy')} />
          <StepCard number="2" title={t('welcome.stepJobTitle')} copy={t('welcome.stepJobCopy')} />
          <StepCard number="3" title={t('welcome.stepAiTitle')} copy={t('welcome.stepAiCopy')} />
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
