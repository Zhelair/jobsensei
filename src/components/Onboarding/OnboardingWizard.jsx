import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  Check, ChevronLeft, ChevronRight, CreditCard, ExternalLink, GraduationCap, Languages, Upload, X,
} from 'lucide-react'
import { openProCheckout } from '../../lib/billing'

function buildInitialProfile(profile = {}, resume = '') {
  return {
    name: profile?.name || '',
    currentRole: profile?.currentRole || '',
    targetRole: profile?.targetRole || '',
    resume: resume || '',
  }
}

export default function OnboardingWizard() {
  const { saveProfile, profile, onboardingMode, closeOnboarding, skipOnboarding } = useApp()
  const { unlockAccess } = useAI()
  const { secureUser, secureAccount, secureAccountsEnabled } = useAuth()
  const { getProjectData, updateProjectData } = useProject()
  const { language, setLanguage, languages, t } = useLanguage()

  const resumeFileRef = useRef(null)
  const resumeFromProject = getProjectData('resume') || ''
  const accessFirstMode = onboardingMode !== 'profile'
  const stepKeys = useMemo(
    () => (accessFirstMode ? ['access', 'profile', 'resume'] : ['profile', 'resume']),
    [accessFirstMode],
  )

  const [step, setStep] = useState(0)
  const [data, setData] = useState(() => buildInitialProfile(profile, resumeFromProject))
  const [extractingResume, setExtractingResume] = useState(false)
  const [accessInput, setAccessInput] = useState(String(secureUser?.email || secureAccount?.email || '').trim())
  const [accessLoading, setAccessLoading] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [accessNotice, setAccessNotice] = useState('')
  const [legacyUnlocked, setLegacyUnlocked] = useState(false)

  useEffect(() => {
    setStep(0)
    setData(buildInitialProfile(profile, resumeFromProject))
  }, [onboardingMode, profile, resumeFromProject])

  useEffect(() => {
    const nextEmail = String(secureUser?.email || secureAccount?.email || '').trim()
    if (nextEmail) {
      setAccessInput(nextEmail)
    }
  }, [secureAccount?.email, secureUser?.email])

  const currentStepKey = stepKeys[step]
  const accessReady = secureAccountsEnabled
    ? Boolean(secureUser && secureAccount?.planActive)
    : legacyUnlocked

  function updateField(key, value) {
    setData(current => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleAccessStart() {
    if (!accessInput.trim()) return

    setAccessLoading(true)
    setAccessError('')
    setAccessNotice('')
    try {
      const result = await unlockAccess(accessInput.trim())
      if (result?.mode === 'magic_link') {
        setAccessNotice(t('settings.unlockMagicLinkSent', { email: result.email }))
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

  async function handleResumeFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setExtractingResume(true)
    try {
      if (file.name.endsWith('.txt') || file.type === 'text/plain') {
        updateField('resume', await file.text())
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          fullText += `${content.items.map(item => item.str).join(' ')}\n`
        }

        updateField('resume', fullText.trim().replace(/\s{3,}/g, '\n') || t('settings.resumePdfFallback'))
      } else {
        updateField(
          'resume',
          (await file.text()).replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n'),
        )
      }
    } catch {
      updateField('resume', t('settings.resumeReadError'))
    } finally {
      setExtractingResume(false)
      event.target.value = ''
    }
  }

  function finishSetup() {
    saveProfile({
      name: data.name,
      currentRole: data.currentRole,
      targetRole: data.targetRole,
      experience: '',
      industry: '',
      targetIndustries: '',
      targetCompanies: '',
    })

    if (data.resume.trim()) {
      updateProjectData('resume', data.resume)
    }
  }

  function goNext() {
    if (currentStepKey === 'access' && !accessReady) return
    if (step < stepKeys.length - 1) {
      setStep(current => current + 1)
      return
    }
    finishSetup()
  }

  function goBack() {
    if (step > 0) {
      setStep(current => current - 1)
      return
    }

    if (!accessFirstMode) {
      closeOnboarding()
    }
  }

  function renderAccessStep() {
    const activePlanLabel = secureAccount?.planTier === 'pro' ? t('onboarding.proPlan') : t('onboarding.freePlan')

    return (
      <div className="space-y-5">
        <div className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-4">
          <div className="rounded-3xl border border-teal-500/20 bg-teal-500/5 p-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-200 text-xs font-display font-semibold uppercase tracking-[0.18em]">
              {t('onboarding.badge')}
            </div>
            <h3 className="font-display font-bold text-white text-2xl mt-4">{t('onboarding.welcome')}</h3>
            <p className="text-slate-300 text-sm leading-relaxed mt-2">{t('onboarding.tagline')}</p>

            <div className="grid md:grid-cols-2 gap-3 mt-5">
              <div className="rounded-2xl border border-white/8 bg-navy-950/60 p-4">
                <div className="text-slate-400 text-xs font-display font-semibold uppercase tracking-[0.16em]">
                  {t('onboarding.freePlan')}
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <div className="text-white text-3xl font-display font-bold">{t('onboarding.freePrice')}</div>
                  <div className="text-slate-500 text-sm">{t('onboarding.perMonth')}</div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('onboarding.freeCopy')}</p>
              </div>

              <div className="rounded-2xl border border-teal-500/25 bg-teal-500/8 p-4">
                <div className="text-teal-200 text-xs font-display font-semibold uppercase tracking-[0.16em]">
                  {t('onboarding.proPlan')}
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <div className="text-white text-3xl font-display font-bold">{t('onboarding.proPrice')}</div>
                  <div className="text-slate-500 text-sm">{t('onboarding.perMonth')}</div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mt-3">{t('onboarding.proCopy')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-navy-600 bg-navy-950/70 p-5">
            <label className="text-sm text-slate-400 mb-1.5 block">{t('onboarding.emailLabel')}</label>
            <input
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
                if (event.key === 'Enter') {
                  handleAccessStart()
                }
              }}
            />

            <div className="grid sm:grid-cols-2 gap-2 mt-3">
              <button
                onClick={handleAccessStart}
                disabled={!accessInput.trim() || accessLoading}
                className="btn-primary justify-center"
              >
                <Check size={14} /> {accessLoading ? t('settings.activating') : t('onboarding.freeCta')}
              </button>
              <button
                onClick={handleCheckoutOpen}
                className="btn-secondary justify-center border-yellow-500/30 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
              >
                <CreditCard size={14} /> {t('onboarding.proCta')}
              </button>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mt-3">{t('onboarding.sameEmailHint')}</p>
            <p className="text-slate-500 text-sm leading-relaxed mt-2">{t('onboarding.legacySupportNote')}</p>

            {accessReady && (
              <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                <div className="flex items-center gap-2 text-green-300 text-sm font-display font-semibold">
                  <Check size={15} /> {t('onboarding.accessReady')}
                </div>
                <div className="text-slate-200 text-sm leading-relaxed mt-1">
                  {secureUser?.email || secureAccount?.email || accessInput}
                </div>
                <div className="text-slate-400 text-sm leading-relaxed mt-1">
                  {t('onboarding.accessReadyCopy')}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-[0.16em] mt-3">
                  {activePlanLabel}
                </div>
              </div>
            )}

            {accessNotice && <p className="text-green-400 text-sm leading-relaxed mt-4">{accessNotice}</p>}
            {accessError && <p className="text-red-400 text-sm leading-relaxed mt-4">{accessError}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-navy-600 bg-navy-950/55 p-4">
          <div className="text-white text-sm font-display font-semibold mb-3">{t('onboarding.legalLinksTitle')}</div>
          <div className="flex flex-wrap gap-2">
            <a href={`/pricing.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
              <ExternalLink size={13} /> {t('settings.pricingLink')}
            </a>
            <a href={`/refund-policy.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
              <ExternalLink size={13} /> {t('settings.refundPolicyLink')}
            </a>
            <a href={`/terms-and-conditions.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
              <ExternalLink size={13} /> {t('settings.termsConditionsLink')}
            </a>
            <a href={`/privacy-policy.html?lang=${language}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
              <ExternalLink size={13} /> {t('settings.privacyPolicyLink')}
            </a>
          </div>
        </div>
      </div>
    )
  }

  function renderProfileStep() {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">{t('onboarding.languageLabel')}</label>
          <div className="relative">
            <Languages size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400 pointer-events-none" />
            <select className="input-field pl-11" value={language} onChange={event => setLanguage(event.target.value)}>
              {languages.map(option => (
                <option key={option.code} value={option.code}>{option.nativeLabel}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">{t('onboarding.nameLabel')}</label>
          <input
            className="input-field"
            placeholder={t('onboarding.namePlaceholder')}
            value={data.name}
            onChange={event => updateField('name', event.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">{t('onboarding.currentRoleLabel')}</label>
          <input
            className="input-field"
            placeholder={t('onboarding.currentRolePlaceholder')}
            value={data.currentRole}
            onChange={event => updateField('currentRole', event.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">{t('onboarding.targetRoleLabel')}</label>
          <input
            className="input-field"
            placeholder={t('onboarding.targetRolePlaceholder')}
            value={data.targetRole}
            onChange={event => updateField('targetRole', event.target.value)}
          />
        </div>
      </div>
    )
  }

  function renderResumeStep() {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button onClick={() => resumeFileRef.current?.click()} className="btn-secondary flex-1 justify-center">
            <Upload size={14} />
            {extractingResume ? t('onboarding.reading') : t('onboarding.upload')}
          </button>
          <input
            ref={resumeFileRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx,.rtf"
            className="hidden"
            onChange={handleResumeFile}
          />
        </div>

        <textarea
          className="textarea-field h-40 text-sm"
          placeholder={t('onboarding.resumePlaceholder')}
          value={data.resume}
          onChange={event => updateField('resume', event.target.value)}
        />

        {data.resume.trim() ? (
          <p className="text-teal-300 text-sm leading-relaxed">
            {t('onboarding.resumeCapturedWithCount', { count: data.resume.length.toLocaleString() })}
          </p>
        ) : (
          <p className="text-slate-500 text-sm leading-relaxed">{t('onboarding.resumeLater')}</p>
        )}
      </div>
    )
  }

  const stepMeta = {
    access: {
      title: t('onboarding.accessTitle'),
      subtitle: t('onboarding.accessSubtitle'),
      content: renderAccessStep(),
    },
    profile: {
      title: t('onboarding.profileTitle'),
      subtitle: t('onboarding.profileSubtitle'),
      content: renderProfileStep(),
    },
    resume: {
      title: t('onboarding.resumeTitle'),
      subtitle: t('onboarding.resumeSubtitle'),
      content: renderResumeStep(),
    },
  }

  const isFinalStep = step === stepKeys.length - 1

  return (
    <div className="fixed inset-0 bg-navy-950/92 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-navy-800 border border-navy-700 rounded-[28px] w-full max-w-5xl shadow-2xl animate-in overflow-hidden">
        <div className="px-6 md:px-8 pt-6 md:pt-7 pb-5 border-b border-navy-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center">
                <GraduationCap size={22} className="text-white" />
              </div>
              <div>
                <h2 className="font-display font-bold text-white text-2xl">{stepMeta[currentStepKey].title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mt-1">{stepMeta[currentStepKey].subtitle}</p>
              </div>
            </div>

            {!accessFirstMode && (
              <button onClick={closeOnboarding} className="btn-ghost text-xs text-slate-400 hover:text-white px-2.5">
                <X size={15} /> {t('onboarding.close')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-5">
            {stepKeys.map((key, index) => (
              <div key={key} className="space-y-2">
                <div className={`h-1.5 rounded-full transition-colors ${index <= step ? 'bg-teal-500' : 'bg-navy-600'}`} />
                <div className={`text-xs font-display uppercase tracking-[0.16em] ${index <= step ? 'text-slate-300' : 'text-slate-500'}`}>
                  {t(`onboarding.step${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 md:px-8 py-6 md:py-7 max-h-[70vh] overflow-y-auto">
          {stepMeta[currentStepKey].content}
        </div>

        <div className="px-6 md:px-8 pb-6 md:pb-7 flex items-center justify-between gap-3">
          {step > 0 || !accessFirstMode ? (
            <button onClick={goBack} className="btn-ghost">
              <ChevronLeft size={16} />
              {step > 0 ? t('onboarding.back') : t('onboarding.close')}
            </button>
          ) : accessFirstMode ? (
            <button onClick={skipOnboarding} className="btn-ghost text-slate-400 hover:text-white">
              {t('onboarding.skip')}
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-col items-end gap-2">
            {currentStepKey === 'access' && !accessReady && (
              <p className="text-slate-500 text-xs">{t('onboarding.completeAccessFirst')}</p>
            )}
            <button
              onClick={goNext}
              disabled={currentStepKey === 'access' && !accessReady}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFinalStep ? <Check size={16} /> : null}
              {isFinalStep ? t('onboarding.finish') : t('onboarding.continue')}
              {!isFinalStep ? <ChevronRight size={16} /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
